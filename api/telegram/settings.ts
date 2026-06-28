export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { getIntegration, upsertIntegration } from '../_lib/integrations.js'
import {
  mergeTelegramNotifications,
  parseTelegramNotifications,
  type TelegramNotificationSettings,
} from '../_lib/telegram/notify.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const existing = await getIntegration(user.id, 'telegram')
    if (!existing?.access_token || existing.access_token === 'pending') {
      return errorResponse('Telegram not connected', 400)
    }

    const body = (await request.json()) as Partial<TelegramNotificationSettings> & {
      timezone?: string
      timezone_offset?: number
    }
    const current = parseTelegramNotifications(existing.metadata ?? {})
    const metadata = mergeTelegramNotifications(existing.metadata ?? {}, {
      digest_enabled: body.digest_enabled ?? current.digest_enabled,
      digest_hour_utc: body.digest_hour_utc ?? current.digest_hour_utc,
      alert_deploy_fail: body.alert_deploy_fail ?? current.alert_deploy_fail,
    })

    if (typeof body.timezone === 'string' && body.timezone.length > 0) {
      metadata.timezone = body.timezone
    }
    if (typeof body.timezone_offset === 'number' && Number.isFinite(body.timezone_offset)) {
      metadata.timezone_offset = body.timezone_offset
    }

    await upsertIntegration(user.id, 'telegram', {
      access_token: existing.access_token,
      refresh_token: existing.refresh_token,
      metadata,
    })

    return json({ settings: parseTelegramNotifications(metadata) })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Settings update failed', 500)
  }
}
