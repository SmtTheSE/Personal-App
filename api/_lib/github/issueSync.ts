import { fetchAllOpenRepoIssues, type GitHubIssueRaw } from './issuesClient'
import {
  parseIssueSyncSettings,
  type GitHubIssueSyncStats,
} from './issueSettings'
import { priorityFromLabels } from './priority'
import { getIntegration, getIntegrationToken, serviceFetch } from '../integrations'

interface IssueMapping {
  id: string
  repo_full_name: string
  external_issue_number: number
  external_issue_id: number
  task_id: string
  content_hash: string
}

interface ProjectRow {
  id: string
  repo_url: string | null
}

interface TaskRow {
  id: string
}

async function hashContent(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function issueSnapshot(issue: GitHubIssueRaw) {
  return JSON.stringify({
    title: issue.title,
    body: issue.body ?? '',
    labels: issue.labels.map((l) => l.name.toLowerCase()).sort(),
    milestone_due: issue.milestone?.due_on ?? null,
    state: issue.state,
    number: issue.number,
  })
}

function issueDescription(repoFullName: string, issue: GitHubIssueRaw): string {
  const parts: string[] = []
  if (issue.body?.trim()) parts.push(issue.body.trim())
  parts.push('---')
  parts.push(`GitHub: ${repoFullName}#${issue.number}`)
  parts.push(issue.html_url)
  return parts.join('\n')
}

function dueDateFromIssue(issue: GitHubIssueRaw): string | null {
  const due = issue.milestone?.due_on
  if (!due) return null
  return due.split('T')[0]
}

async function fetchProjects(userId: string): Promise<ProjectRow[]> {
  const res = await serviceFetch(
    `/rest/v1/projects?user_id=eq.${userId}&select=id,repo_url`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

function resolveProjectId(projects: ProjectRow[], repoFullName: string): string | null {
  const needle = repoFullName.toLowerCase()
  const match = projects.find((project) => project.repo_url?.toLowerCase().includes(needle))
  return match?.id ?? null
}

async function nextTaskSortOrder(userId: string): Promise<number> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&select=sort_order&order=sort_order.desc&limit=1`
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { sort_order: number }[]
  return (rows[0]?.sort_order ?? -1) + 1
}

async function fetchMapping(
  userId: string,
  repoFullName: string,
  issueNumber: number
): Promise<IssueMapping | null> {
  const res = await serviceFetch(
    `/rest/v1/github_issue_sync_mappings?user_id=eq.${userId}&repo_full_name=eq.${encodeURIComponent(repoFullName)}&external_issue_number=eq.${issueNumber}&select=*&limit=1`
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as IssueMapping[]
  return rows[0] ?? null
}

async function fetchMappingsForRepo(userId: string, repoFullName: string): Promise<IssueMapping[]> {
  const res = await serviceFetch(
    `/rest/v1/github_issue_sync_mappings?user_id=eq.${userId}&repo_full_name=eq.${encodeURIComponent(repoFullName)}&select=*`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function upsertMapping(
  userId: string,
  repoFullName: string,
  issue: GitHubIssueRaw,
  taskId: string,
  contentHash: string
) {
  const res = await serviceFetch(
    '/rest/v1/github_issue_sync_mappings?on_conflict=user_id,repo_full_name,external_issue_number',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        repo_full_name: repoFullName,
        external_issue_number: issue.number,
        external_issue_id: issue.id,
        task_id: taskId,
        content_hash: contentHash,
        last_synced_at: new Date().toISOString(),
      }),
    }
  )
  if (!res.ok) throw new Error(await res.text())
}

async function createTask(
  userId: string,
  issue: GitHubIssueRaw,
  repoFullName: string,
  projectId: string | null,
  labelPriority: Record<string, 'low' | 'medium' | 'high'>
) {
  const sort_order = await nextTaskSortOrder(userId)
  const res = await serviceFetch('/rest/v1/tasks', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      title: issue.title,
      description: issueDescription(repoFullName, issue),
      priority: priorityFromLabels(issue.labels, labelPriority),
      status: 'todo',
      due_date: dueDateFromIssue(issue),
      project_id: projectId,
      sort_order,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as { id: string }[]
  const task = rows[0]
  if (!task?.id) throw new Error('Task create returned no row')
  return task
}

async function updateTask(
  taskId: string,
  issue: GitHubIssueRaw,
  repoFullName: string,
  projectId: string | null,
  labelPriority: Record<string, 'low' | 'medium' | 'high'>
) {
  const res = await serviceFetch(`/rest/v1/tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      title: issue.title,
      description: issueDescription(repoFullName, issue),
      priority: priorityFromLabels(issue.labels, labelPriority),
      due_date: dueDateFromIssue(issue),
      project_id: projectId,
      status: 'todo',
      completed_at: null,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function closeTask(taskId: string) {
  const res = await serviceFetch(`/rest/v1/tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      status: 'done',
      completed_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function syncRepoIssues(
  userId: string,
  token: string,
  repoFullName: string,
  settings: ReturnType<typeof parseIssueSyncSettings>,
  projects: ProjectRow[],
  stats: GitHubIssueSyncStats
) {
  const issues = await fetchAllOpenRepoIssues(token, repoFullName)
  const openNumbers = new Set(issues.map((issue) => issue.number))
  const projectId = resolveProjectId(projects, repoFullName)

  for (const issue of issues) {
    try {
      const contentHash = await hashContent(issueSnapshot(issue))
      const mapping = await fetchMapping(userId, repoFullName, issue.number)

      if (mapping?.content_hash === contentHash) {
        stats.unchanged++
        continue
      }

      if (mapping) {
        await updateTask(mapping.task_id, issue, repoFullName, projectId, settings.label_priority)
        await upsertMapping(userId, repoFullName, issue, mapping.task_id, contentHash)
        stats.updated++
      } else {
        const task = await createTask(userId, issue, repoFullName, projectId, settings.label_priority)
        await upsertMapping(userId, repoFullName, issue, task.id, contentHash)
        stats.created++
      }
    } catch (err) {
      stats.errors.push(
        `${repoFullName}#${issue.number}: ${err instanceof Error ? err.message : 'sync failed'}`
      )
    }
  }

  if (!settings.sync_closed_as_done) return

  const mappings = await fetchMappingsForRepo(userId, repoFullName)
  for (const mapping of mappings) {
    if (openNumbers.has(mapping.external_issue_number)) continue
    try {
      await closeTask(mapping.task_id)
      stats.closed++
    } catch (err) {
      stats.errors.push(
        `${repoFullName}#${mapping.external_issue_number}: ${err instanceof Error ? err.message : 'close failed'}`
      )
    }
  }
}

export async function fullGitHubIssueSync(userId: string): Promise<GitHubIssueSyncStats> {
  const token = await getIntegrationToken(userId, 'github')
  if (!token) throw new Error('GitHub not connected')

  const integration = await getIntegration(userId, 'github')
  const settings = parseIssueSyncSettings(integration?.metadata ?? {})

  if (!settings.enabled) {
    throw new Error('GitHub issue sync is disabled')
  }
  if (!settings.repos.length) {
    throw new Error('Select at least one repository to sync')
  }

  const stats: GitHubIssueSyncStats = {
    created: 0,
    updated: 0,
    closed: 0,
    unchanged: 0,
    errors: [],
  }

  const projects = await fetchProjects(userId)

  for (const repoFullName of settings.repos) {
    try {
      await syncRepoIssues(userId, token, repoFullName, settings, projects, stats)
    } catch (err) {
      stats.errors.push(`${repoFullName}: ${err instanceof Error ? err.message : 'repo sync failed'}`)
    }
  }

  return stats
}
