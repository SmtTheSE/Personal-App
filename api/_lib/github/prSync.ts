import { fetchAllOpenRepoPulls, fetchGitHubUsername, type GitHubPRRaw } from './prsClient'
import { parsePRSyncSettings, type GitHubPRSyncSettings } from './prSettings'
import type { GitHubIssueSyncStats } from './issueSettings'
import { priorityFromLabels } from './priority'
import { getIntegration, getIntegrationToken, serviceFetch } from '../integrations'
import { formatGitHubFooter, githubPrRef } from '../tasks/source'
import { buildDescription, mergeSyncedTaskUpdate } from '../tasks/syncHelpers'

interface PRMapping {
  id: string
  repo_full_name: string
  external_pr_number: number
  external_pr_id: number
  task_id: string
  content_hash: string
}

interface ProjectRow {
  id: string
  repo_url: string | null
}

interface TaskRow {
  id: string
  status: string
  kanban_column?: string | null
}

async function hashContent(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function prSnapshot(pr: GitHubPRRaw) {
  return JSON.stringify({
    title: pr.title,
    body: pr.body ?? '',
    labels: pr.labels.map((l) => l.name.toLowerCase()).sort(),
    state: pr.state,
    number: pr.number,
    draft: pr.draft,
  })
}

function prDescription(repoFullName: string, pr: GitHubPRRaw): string {
  const footer = formatGitHubFooter(repoFullName, pr.number, pr.html_url, 'pr')
  return buildDescription(pr.body, footer) ?? footer
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
  prNumber: number
): Promise<PRMapping | null> {
  const res = await serviceFetch(
    `/rest/v1/github_pr_sync_mappings?user_id=eq.${userId}&repo_full_name=eq.${encodeURIComponent(repoFullName)}&external_pr_number=eq.${prNumber}&select=*&limit=1`
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as PRMapping[]
  return rows[0] ?? null
}

async function fetchMappingsForRepo(userId: string, repoFullName: string): Promise<PRMapping[]> {
  const res = await serviceFetch(
    `/rest/v1/github_pr_sync_mappings?user_id=eq.${userId}&repo_full_name=eq.${encodeURIComponent(repoFullName)}&select=*`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function upsertMapping(
  userId: string,
  repoFullName: string,
  pr: GitHubPRRaw,
  taskId: string,
  contentHash: string
) {
  const res = await serviceFetch(
    '/rest/v1/github_pr_sync_mappings?on_conflict=user_id,repo_full_name,external_pr_number',
    {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        repo_full_name: repoFullName,
        external_pr_number: pr.number,
        external_pr_id: pr.id,
        task_id: taskId,
        content_hash: contentHash,
        last_synced_at: new Date().toISOString(),
      }),
    }
  )
  if (!res.ok) throw new Error(await res.text())
}

async function fetchTaskRow(userId: string, taskId: string): Promise<TaskRow | null> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&id=eq.${taskId}&select=id,status,kanban_column&limit=1`
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as TaskRow[]
  return rows[0] ?? null
}

async function createTask(
  userId: string,
  pr: GitHubPRRaw,
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
      title: `Review: ${pr.title}`,
      description: prDescription(repoFullName, pr),
      priority: priorityFromLabels(pr.labels, labelPriority),
      status: 'in_progress',
      kanban_column: 'review',
      due_date: null,
      project_id: projectId,
      sort_order,
      source: 'github_pr',
      external_ref: githubPrRef(repoFullName, pr.number, pr.html_url),
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as { id: string }[]
  const task = rows[0]
  if (!task?.id) throw new Error('Task create returned no row')
  return task
}

async function updateTask(
  userId: string,
  taskId: string,
  pr: GitHubPRRaw,
  repoFullName: string,
  projectId: string | null,
  labelPriority: Record<string, 'low' | 'medium' | 'high'>
) {
  const existing = await fetchTaskRow(userId, taskId)
  const patch = mergeSyncedTaskUpdate(existing ?? { id: taskId, status: 'in_progress', kanban_column: 'review' }, {
    title: `Review: ${pr.title}`,
    description: prDescription(repoFullName, pr),
    priority: priorityFromLabels(pr.labels, labelPriority),
    due_date: null,
    project_id: projectId,
  })

  const res = await serviceFetch(`/rest/v1/tasks?id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      ...patch,
      external_ref: githubPrRef(repoFullName, pr.number, pr.html_url),
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
      kanban_column: 'done',
      completed_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

function shouldIncludePR(
  pr: GitHubPRRaw,
  settings: GitHubPRSyncSettings,
  githubUsername: string | null
): boolean {
  if (pr.draft) return false
  if (!settings.review_requested_only) return true
  if (!githubUsername) return true
  const reviewers = pr.requested_reviewers ?? []
  return reviewers.some((r) => r.login.toLowerCase() === githubUsername.toLowerCase())
}

async function syncRepoPRs(
  userId: string,
  token: string,
  repoFullName: string,
  settings: GitHubPRSyncSettings,
  projects: ProjectRow[],
  githubUsername: string | null,
  stats: GitHubIssueSyncStats
) {
  const pulls = await fetchAllOpenRepoPulls(token, repoFullName)
  const openNumbers = new Set(pulls.map((pr) => pr.number))
  const projectId = resolveProjectId(projects, repoFullName)

  for (const pr of pulls) {
    if (!shouldIncludePR(pr, settings, githubUsername)) continue

    try {
      const contentHash = await hashContent(prSnapshot(pr))
      const mapping = await fetchMapping(userId, repoFullName, pr.number)

      if (mapping?.content_hash === contentHash) {
        stats.unchanged++
        continue
      }

      if (mapping) {
        await updateTask(userId, mapping.task_id, pr, repoFullName, projectId, {})
        await upsertMapping(userId, repoFullName, pr, mapping.task_id, contentHash)
        stats.updated++
      } else {
        const task = await createTask(userId, pr, repoFullName, projectId, {})
        await upsertMapping(userId, repoFullName, pr, task.id, contentHash)
        stats.created++
      }
    } catch (err) {
      stats.errors.push(
        `${repoFullName}#${pr.number}: ${err instanceof Error ? err.message : 'sync failed'}`
      )
    }
  }

  if (!settings.sync_merged_as_done) return

  const mappings = await fetchMappingsForRepo(userId, repoFullName)
  for (const mapping of mappings) {
    if (openNumbers.has(mapping.external_pr_number)) continue
    try {
      await closeTask(mapping.task_id)
      stats.closed++
    } catch (err) {
      stats.errors.push(
        `${repoFullName}#${mapping.external_pr_number}: ${err instanceof Error ? err.message : 'close failed'}`
      )
    }
  }
}

export async function fullGitHubPRSync(userId: string): Promise<GitHubIssueSyncStats> {
  const token = await getIntegrationToken(userId, 'github')
  if (!token) throw new Error('GitHub not connected')

  const integration = await getIntegration(userId, 'github')
  const settings = parsePRSyncSettings(integration?.metadata ?? {})

  if (!settings.enabled) {
    throw new Error('GitHub PR sync is disabled')
  }
  if (!settings.repos.length) {
    throw new Error('Select at least one repository to sync PRs')
  }

  const stats: GitHubIssueSyncStats = {
    created: 0,
    updated: 0,
    closed: 0,
    unchanged: 0,
    errors: [],
  }

  const [projects, githubUsername] = await Promise.all([
    fetchProjects(userId),
    fetchGitHubUsername(token),
  ])

  for (const repoFullName of settings.repos) {
    try {
      await syncRepoPRs(userId, token, repoFullName, settings, projects, githubUsername, stats)
    } catch (err) {
      stats.errors.push(`${repoFullName}: ${err instanceof Error ? err.message : 'repo sync failed'}`)
    }
  }

  return stats
}

export type { GitHubPRSyncSettings }
