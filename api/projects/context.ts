export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { serviceFetch, getIntegrationToken } from '../_lib/integrations'
import { syncGitHubActivitySessions } from '../_lib/timeTracking/githubActivity'
import { errorResponse, json } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  const url = new URL(request.url)
  const projectId = url.searchParams.get('project_id')
  if (!projectId) return errorResponse('project_id required', 400)

  try {
    const [projectRes, tasksRes, notesRes, sessionsRes, linksRes, githubToken] = await Promise.all([
      serviceFetch(
        `/rest/v1/projects?id=eq.${projectId}&user_id=eq.${user.id}&select=id,title,status,repo_url,demo_url,tech_stack&limit=1`
      ),
      serviceFetch(
        `/rest/v1/tasks?project_id=eq.${projectId}&user_id=eq.${user.id}&status=neq.done&select=id,title,priority,due_date,kanban_column,source&order=due_date.asc.nullslast&limit=20`
      ),
      serviceFetch(
        `/rest/v1/notes?project_id=eq.${projectId}&user_id=eq.${user.id}&select=id,title,updated_at&order=updated_at.desc&limit=10`
      ),
      serviceFetch(
        `/rest/v1/study_sessions?project_id=eq.${projectId}&user_id=eq.${user.id}&select=id,topic,duration_mins,source,started_at&order=started_at.desc&limit=10`
      ),
      serviceFetch(
        `/rest/v1/project_integration_links?project_id=eq.${projectId}&user_id=eq.${user.id}&select=provider,external_id,external_ref`
      ),
      getIntegrationToken(user.id, 'github'),
    ])

    const projects = projectRes.ok ? await projectRes.json() : []
    const project = projects[0]
    if (!project) return errorResponse('Project not found', 404)

    const tasks = tasksRes.ok ? await tasksRes.json() : []
    const notes = notesRes.ok ? await notesRes.json() : []
    const sessions = sessionsRes.ok ? await sessionsRes.json() : []
    const links = linksRes.ok ? await linksRes.json() : []

    let github: Record<string, unknown> | null = null
    let vercel: Record<string, unknown> | null = null

    const githubLink = links.find((l: { provider: string }) => l.provider === 'github')
    const vercelLink = links.find((l: { provider: string }) => l.provider === 'vercel')

    if (githubToken && githubLink) {
      const repo = (githubLink.external_ref as { repo?: string })?.repo ?? project.repo_url?.replace(/^.*github.com\//, '')
      if (repo) {
        const [issuesRes, prsRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${repo}/issues?state=open&per_page=5`, {
            headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
          }),
          fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=5`, {
            headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json' },
          }),
        ])
        github = {
          repo,
          open_issues: issuesRes.ok ? await issuesRes.json() : [],
          open_prs: prsRes.ok ? await prsRes.json() : [],
        }
      }
    }

    if (vercelLink) {
      const vercelToken = await getIntegrationToken(user.id, 'vercel')
      if (vercelToken) {
        const deployRes = await fetch(
          `https://api.vercel.com/v6/deployments?projectId=${vercelLink.external_id}&limit=3`,
          { headers: { Authorization: `Bearer ${vercelToken}` } }
        )
        vercel = {
          project_id: vercelLink.external_id,
          deployments: deployRes.ok ? ((await deployRes.json()) as { deployments?: unknown[] }).deployments ?? [] : [],
        }
      }
    }

    const studyMins = (sessions as { duration_mins: number }[]).reduce((s, x) => s + x.duration_mins, 0)

    return json({
      project,
      tasks,
      notes,
      sessions,
      study_mins_total: studyMins,
      github,
      vercel,
      integration_links: links,
    })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Context load failed', 500)
  }
}

export async function syncProjectTimeTracking(request: Request, userId: string, projectId: string) {
  return syncGitHubActivitySessions(userId, projectId)
}
