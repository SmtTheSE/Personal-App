export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { getIntegrationToken, hasIntegration } from '../_lib/integrations'
import { errorResponse, json } from '../_lib/http'

interface VercelProjectRaw {
  id: string
  name: string
  framework: string | null
  link?: { type?: string; repo?: string; repoId?: number; org?: string }
}

interface VercelDeploymentRaw {
  uid: string
  name: string
  state: string
  url: string | null
  created: number
  target: string | null
  projectId?: string
  meta?: Record<string, string>
}

interface GitHubRepoRaw {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  private: boolean
  updated_at: string
  language: string | null
  stargazers_count: number
  default_branch: string
}

function vercelHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function mapDeployment(d: VercelDeploymentRaw) {
  return {
    uid: d.uid,
    name: d.name,
    state: d.state,
    url: d.url,
    created: d.created,
    target: d.target,
    meta: d.meta,
  }
}

function buildStats(deployments: VercelDeploymentRaw[]) {
  const deploysByDay: Record<string, number> = {}
  let successCount = 0
  let errorCount = 0
  let buildingCount = 0

  for (const d of deployments) {
    const day = new Date(d.created).toISOString().split('T')[0]
    deploysByDay[day] = (deploysByDay[day] ?? 0) + 1
    if (d.state === 'READY') successCount++
    else if (d.state === 'ERROR' || d.state === 'CANCELED') errorCount++
    else if (d.state === 'BUILDING' || d.state === 'QUEUED') buildingCount++
  }

  const total = deployments.length
  const successRate = total ? Math.round((successCount / total) * 100) : 0

  return {
    totalDeploys: total,
    successCount,
    errorCount,
    buildingCount,
    successRate,
    deploysByDay,
  }
}

function linkRepos(
  repos: GitHubRepoRaw[],
  projects: VercelProjectRaw[],
  deploymentsByProject: Map<string, VercelDeploymentRaw | undefined>
) {
  const repoMap = new Map(repos.map((r) => [r.full_name.toLowerCase(), r]))
  const linkedByRepo = new Map<string, ReturnType<typeof buildLinkedEntry>>()

  for (const project of projects) {
    const repoName = project.link?.repo?.toLowerCase()
    if (!repoName) continue
    const github = repoMap.get(repoName)
    const latestDeployment = deploymentsByProject.get(project.id)
    linkedByRepo.set(repoName, buildLinkedEntry(repoName, github, project, latestDeployment))
  }

  for (const repo of repos) {
    const key = repo.full_name.toLowerCase()
    if (!linkedByRepo.has(key)) {
      linkedByRepo.set(key, buildLinkedEntry(key, repo, undefined, null))
    }
  }

  return Array.from(linkedByRepo.values()).sort((a, b) => {
    if (a.onVercel !== b.onVercel) return a.onVercel ? -1 : 1
    return a.repoFullName.localeCompare(b.repoFullName)
  })
}

function buildLinkedEntry(
  repoFullName: string,
  github: GitHubRepoRaw | undefined,
  project: VercelProjectRaw | undefined,
  latestDeployment: VercelDeploymentRaw | null | undefined
) {
  return {
    repoFullName: github?.full_name ?? repoFullName,
    github: github
      ? {
          id: github.id,
          name: github.name,
          full_name: github.full_name,
          html_url: github.html_url,
          description: github.description,
          private: github.private,
          updated_at: github.updated_at,
          language: github.language,
          stargazers_count: github.stargazers_count,
          default_branch: github.default_branch,
        }
      : undefined,
    vercelProject: project
      ? {
          id: project.id,
          name: project.name,
          framework: project.framework,
          link: project.link,
          latestDeployment: latestDeployment ? mapDeployment(latestDeployment) : null,
        }
      : undefined,
    latestDeployment: latestDeployment ? mapDeployment(latestDeployment) : null,
    onVercel: !!project,
  }
}

async function fetchGitHubRepos(token: string): Promise<GitHubRepoRaw[]> {
  const res = await fetch(
    'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Nexus-Student-OS',
      },
    }
  )
  if (!res.ok) return []
  return res.json()
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const [githubConnected, vercelConnected] = await Promise.all([
      hasIntegration(user.id, 'github'),
      hasIntegration(user.id, 'vercel'),
    ])

    const githubToken = githubConnected ? await getIntegrationToken(user.id, 'github') : null
    const vercelToken = vercelConnected ? await getIntegrationToken(user.id, 'vercel') : null

    if (!githubConnected && !vercelConnected) {
      return json({
        githubConnected: false,
        vercelConnected: false,
        repos: [],
        projects: [],
        deployments: [],
        linked: [],
        stats: {
          totalDeploys: 0,
          successCount: 0,
          errorCount: 0,
          buildingCount: 0,
          successRate: 0,
          deploysByDay: {},
        },
      })
    }

    const repos = githubToken ? await fetchGitHubRepos(githubToken) : []

    let projects: VercelProjectRaw[] = []
    let deployments: VercelDeploymentRaw[] = []

    if (vercelToken) {
      const [projectsRes, deploymentsRes] = await Promise.all([
        fetch('https://api.vercel.com/v9/projects?limit=50', {
          headers: vercelHeaders(vercelToken),
        }),
        fetch('https://api.vercel.com/v6/deployments?limit=100', {
          headers: vercelHeaders(vercelToken),
        }),
      ])

      if (!projectsRes.ok) {
        const detail = await projectsRes.text()
        if (projectsRes.status === 401 || projectsRes.status === 403) {
          return errorResponse('Invalid Vercel token. Update it in Settings.', 401)
        }
        return errorResponse(`Vercel API error: ${detail}`, projectsRes.status)
      }

      const projectsBody = await projectsRes.json()
      projects = projectsBody.projects ?? []

      if (deploymentsRes.ok) {
        const deploymentsBody = await deploymentsRes.json()
        deployments = deploymentsBody.deployments ?? []
      }
    }

    const deploymentsByProject = new Map<string, VercelDeploymentRaw>()
    for (const d of deployments) {
      const pid = d.projectId
      if (!pid) continue
      const existing = deploymentsByProject.get(pid)
      if (!existing || d.created > existing.created) {
        deploymentsByProject.set(pid, d)
      }
    }

    const mappedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      framework: p.framework,
      link: p.link,
      latestDeployment: deploymentsByProject.get(p.id)
        ? mapDeployment(deploymentsByProject.get(p.id)!)
        : null,
    }))

    const linked = linkRepos(repos, projects, deploymentsByProject)
    const stats = buildStats(deployments)

    return json({
      githubConnected,
      vercelConnected,
      repos: repos.map((r) => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        description: r.description,
        private: r.private,
        updated_at: r.updated_at,
        language: r.language,
        stargazers_count: r.stargazers_count,
        default_branch: r.default_branch,
      })),
      projects: mappedProjects,
      deployments: deployments.map(mapDeployment),
      linked,
      stats,
    })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Dashboard fetch failed', 500)
  }
}
