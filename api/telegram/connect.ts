export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { json, errorResponse } from '../_lib/http'
import { getBotUsername } from '../_lib/telegram/bot'
import { createTelegramLink } from '../_lib/telegram/link'
import { getIntegration, upsertIntegration } from '../_lib/integrations'
import { mergeTelegramNotifications } from '../_lib/telegram/notify'

function readTimezonePrefs(request: Request): { timezone?: string; timezone_offset?: number } {
  const url = new URL(request.url)
  const timezone = url.searchParams.get('timezone')?.trim()
  const offsetRaw = url.searchParams.get('timezone_offset')
  const timezone_offset = offsetRaw !== null ? Number(offsetRaw) : undefined
  return {
    timezone: timezone || undefined,
    timezone_offset: Number.isFinite(timezone_offset) ? timezone_offset : undefined,
  }
}

async function readBodyPrefs(request: Request): Promise<{ timezone?: string; timezone_offset?: number }> {
  try {
    const body = (await request.json()) as { timezone?: string; timezone_offset?: number }
    return {
      timezone: typeof body.timezone === 'string' && body.timezone.length > 0 ? body.timezone : undefined,
      timezone_offset:
        typeof body.timezone_offset === 'number' && Number.isFinite(body.timezone_offset)
          ? body.timezone_offset
          : undefined,
    }
  } catch {
    return {}
  }
}

async function saveTimezonePrefs(userId: string, prefs: { timezone?: string; timezone_offset?: number }) {
  if (!prefs.timezone && prefs.timezone_offset === undefined) return

  const existing = await getIntegration(userId, 'telegram')
  if (!existing) return

  const metadata = mergeTelegramNotifications(existing.metadata ?? {}, {})
  if (prefs.timezone) metadata.timezone = prefs.timezone
  if (prefs.timezone_offset !== undefined) metadata.timezone_offset = prefs.timezone_offset

  await upsertIntegration(userId, 'telegram', {
    access_token: existing.access_token,
    refresh_token: existing.refresh_token,
    metadata,
  })
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const prefs =
      request.method === 'POST'
        ? await readBodyPrefs(request)
        : readTimezonePrefs(request)

    const existing = await getIntegration(user.id, 'telegram')
    const linked =
      !!existing?.access_token &&
      existing.access_token !== 'pending' &&
      existing.metadata?.linked !== false

    if (linked && (prefs.timezone || prefs.timezone_offset !== undefined)) {
      await saveTimezonePrefs(user.id, prefs)
      const bot_username = await getBotUsername()
      return json({ bot_username, linked: true, timezone_saved: true })
    }

    const [{ link_code }, bot_username] = await Promise.all([
      createTelegramLink(user.id, prefs),
      getBotUsername(),
    ])
    const link_url = `https://t.me/${bot_username}?start=${link_code}`
    return json({ bot_username, link_code, link_url })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Telegram connect failed', 500)
  }
}
