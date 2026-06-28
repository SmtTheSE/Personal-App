export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth.js'
import { getIntegration, upsertIntegration } from '../../_lib/integrations.js'
import {
  mergePRSyncMetadata,
  parsePRSyncSettings,
  type GitHubPRSyncSettings,
} from '../../_lib/github/prSettings.js'
import { errorResponse, json } from '../../_lib/http.js'

type SettingsBody = Partial<GitHubPRSyncSettings>

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const existing = await getIntegration(user.id, 'github')
    if (!existing?.access_token) {
      return errorResponse('GitHub not connected', 400)
    }

    const body = (await request.json()) as SettingsBody
    const current = parsePRSyncSettings(existing.metadata ?? {})

    const metadata = mergePRSyncMetadata(existing, {
      enabled: body.enabled ?? current.enabled,
      repos: body.repos ?? current.repos,
      review_requested_only: body.review_requested_only ?? current.review_requested_only,
      sync_merged_as_done: body.sync_merged_as_done ?? current.sync_merged_as_done,
    })

    await upsertIntegration(user.id, 'github', {
      access_token: existing.access_token,
      refresh_token: existing.refresh_token,
      metadata,
    })

    return json({ settings: parsePRSyncSettings(metadata) })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Settings update failed', 500)
  }
}
