export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth.js'
import { getIntegration, getIntegrationToken } from '../../_lib/integrations.js'
import {
  parseIssueSyncSettings,
  readLastSync,
} from '../../_lib/github/issueSettings.js'
import { errorResponse, json } from '../../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const githubConnected = !!(await getIntegrationToken(user.id, 'github'))
    const integration = await getIntegration(user.id, 'github')
    const metadata = integration?.metadata ?? {}
    const { last_sync_at, last_sync_stats } = readLastSync(metadata)

    return json({
      github_connected: githubConnected,
      settings: parseIssueSyncSettings(metadata),
      last_sync_at,
      last_sync_stats,
    })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Status failed', 500)
  }
}
