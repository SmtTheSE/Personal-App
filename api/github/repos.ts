export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { getIntegrationToken } from '../_lib/integrations.js'
import { fetchGitHubReposPage, GitHubApiError, mapGitHubRepo } from '../_lib/github.js'
import { errorResponse, json } from '../_lib/http.js'

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

    const url = new URL(request.url)
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
    const perPage = Math.min(
      100,
      Math.max(1, Number.parseInt(url.searchParams.get('per_page') ?? '30', 10) || 30)
    )

    const { repos, hasMore } = await fetchGitHubReposPage(token, page, perPage)

    return json({
      repos: repos.map(mapGitHubRepo),
      page,
      per_page: perPage,
      has_more: hasMore,
    })
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) {
        return errorResponse('GitHub token expired. Reconnect GitHub in Settings.', 401)
      }
      return errorResponse(`GitHub API error: ${err.message}`, err.status)
    }
    return errorResponse(err instanceof Error ? err.message : 'GitHub fetch failed', 500)
  }
}
