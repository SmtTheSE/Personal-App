export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getIntegration, getIntegrationToken } from '../../_lib/integrations'
import { parsePRSyncSettings, readPRLastSync } from '../../_lib/github/prSettings'
import { errorResponse, json } from '../../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const githubConnected = !!(await getIntegrationToken(user.id, 'github'))
    const integration = await getIntegration(user.id, 'github')
    const metadata = integration?.metadata ?? {}
    const { last_sync_at, last_sync_stats } = readPRLastSync(metadata)

    return json({
      github_connected: githubConnected,
      settings: parsePRSyncSettings(metadata),
      last_sync_at,
      last_sync_stats,
    })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Status failed', 500)
  }
}
