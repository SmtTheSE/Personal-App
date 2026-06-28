export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getIntegration, upsertIntegration } from '../../_lib/integrations'
import { fullGitHubPRSync } from '../../_lib/github/prSync'
import { mergePRSyncMetadata } from '../../_lib/github/prSettings'
import { GitHubApiError } from '../../_lib/github'
import { errorResponse, json } from '../../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const stats = await fullGitHubPRSync(user.id)
    const existing = await getIntegration(user.id, 'github')
    if (existing) {
      const metadata = mergePRSyncMetadata(existing, {
        last_sync_at: new Date().toISOString(),
        last_sync_stats: stats,
      })
      await upsertIntegration(user.id, 'github', {
        access_token: existing.access_token,
        refresh_token: existing.refresh_token,
        metadata,
      })
    }

    return json(stats)
  } catch (err) {
    if (err instanceof GitHubApiError) {
      if (err.status === 401) {
        return errorResponse('GitHub token expired. Reconnect GitHub in Settings.', 401)
      }
      if (err.status === 403) {
        return errorResponse('GitHub rate limit or permissions issue. Try again later.', 403)
      }
      return errorResponse(`GitHub API error: ${err.message}`, err.status)
    }
    return errorResponse(err instanceof Error ? err.message : 'Sync failed', 500)
  }
}
