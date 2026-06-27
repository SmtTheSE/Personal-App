export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getIntegration, upsertIntegration } from '../../_lib/integrations'
import {
  mergeIssueSyncMetadata,
  parseIssueSyncSettings,
  type GitHubIssueSyncSettings,
} from '../../_lib/github/issueSettings'
import { errorResponse, json } from '../../_lib/http'

type SettingsBody = Partial<GitHubIssueSyncSettings>

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
    const current = parseIssueSyncSettings(existing.metadata ?? {})

    const metadata = mergeIssueSyncMetadata(existing, {
      enabled: body.enabled ?? current.enabled,
      repos: body.repos ?? current.repos,
      sync_closed_as_done: body.sync_closed_as_done ?? current.sync_closed_as_done,
      label_priority: body.label_priority ?? current.label_priority,
    })

    await upsertIntegration(user.id, 'github', {
      access_token: existing.access_token,
      refresh_token: existing.refresh_token,
      metadata,
    })

    return json({ settings: parseIssueSyncSettings(metadata) })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Settings update failed', 500)
  }
}
