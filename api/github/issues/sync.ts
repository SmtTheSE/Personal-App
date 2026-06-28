export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth.js'
import { getIntegration, upsertIntegration } from '../../_lib/integrations.js'
import { fullGitHubIssueSync } from '../../_lib/github/issueSync.js'
import { mergeIssueSyncMetadata } from '../../_lib/github/issueSettings.js'
import { GitHubApiError } from '../../_lib/github.js'
import { errorResponse, json } from '../../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const stats = await fullGitHubIssueSync(user.id)
    const existing = await getIntegration(user.id, 'github')
    if (existing) {
      const metadata = mergeIssueSyncMetadata(existing, {
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
