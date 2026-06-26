export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { getIntegrationToken } from '../_lib/integrations'
import { errorResponse, json } from '../_lib/http'

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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const token = await getIntegrationToken(user.id, 'github')
    if (!token) {
      return errorResponse('GitHub not connected. Sign in with GitHub or reconnect in Settings.', 400)
    }

    const repos: GitHubRepoRaw[] = []
    let page = 1

    while (page <= 3) {
      const res = await fetch(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Nexus-Student-OS',
          },
        }
      )

      if (!res.ok) {
        const detail = await res.text()
        if (res.status === 401) {
          return errorResponse('GitHub token expired. Reconnect GitHub in Settings.', 401)
        }
        return errorResponse(`GitHub API error: ${detail}`, res.status)
      }

      const batch = (await res.json()) as GitHubRepoRaw[]
      repos.push(...batch)
      if (batch.length < 100) break
      page++
    }

    const mapped = repos.map((r) => ({
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
    }))

    return json({ repos: mapped })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'GitHub fetch failed', 500)
  }
}
