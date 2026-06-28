export const config = { runtime: 'edge' }

import { json, errorResponse } from '../_lib/http'
import { serviceFetch } from '../_lib/integrations'
import { buildDailyDigest } from '../_lib/telegram/commands'
import { notifyUser, parseTelegramNotifications } from '../_lib/telegram/notify'

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  return request.headers.get('Authorization') === `Bearer ${expected}`
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }
  if (!verifyCronSecret(request)) return errorResponse('Unauthorized', 401)

  const hourUtc = new Date().getUTCHours()

  try {
    const res = await serviceFetch(
      '/rest/v1/user_integrations?provider=eq.telegram&select=user_id,metadata,access_token'
    )
    if (!res.ok) throw new Error(await res.text())

    const rows = (await res.json()) as Array<{
      user_id: string
      access_token: string
      metadata?: Record<string, unknown>
    }>

    let sent = 0
    let skipped = 0

    for (const row of rows) {
      if (!row.access_token || row.access_token === 'pending') {
        skipped++
        continue
      }
      const settings = parseTelegramNotifications(row.metadata ?? {})
      if (!settings.digest_enabled || settings.digest_hour_utc !== hourUtc) {
        skipped++
        continue
      }

      const digest = await buildDailyDigest(row.user_id)
      const ok = await notifyUser(row.user_id, digest)
      if (ok) sent++
      else skipped++
    }

    return json({ sent, skipped, hour_utc: hourUtc })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Digest failed', 500)
  }
}
