import { serviceFetch } from '../integrations.js'
import { sendTelegramMessage } from './bot.js'

export async function findChatIdByUserId(userId: string): Promise<number | null> {
  const res = await serviceFetch(
    `/rest/v1/user_integrations?user_id=eq.${userId}&provider=eq.telegram&select=access_token,metadata&limit=1`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { access_token: string; metadata?: { linked?: boolean } }[]
  const row = rows[0]
  if (!row?.access_token || row.access_token === 'pending' || row.metadata?.linked === false) {
    return null
  }
  const chatId = Number(row.access_token)
  return Number.isFinite(chatId) ? chatId : null
}

export async function notifyUser(userId: string, text: string, options?: { silent?: boolean }): Promise<boolean> {
  const chatId = await findChatIdByUserId(userId)
  if (!chatId) return false
  await sendTelegramMessage(chatId, text, options)
  return true
}

export interface TelegramNotificationSettings {
  digest_enabled: boolean
  digest_hour_utc: number
  alert_deploy_fail: boolean
}

export const DEFAULT_TELEGRAM_NOTIFICATIONS: TelegramNotificationSettings = {
  digest_enabled: false,
  digest_hour_utc: 8,
  alert_deploy_fail: true,
}

export function parseTelegramNotifications(metadata: Record<string, unknown>): TelegramNotificationSettings {
  const raw = metadata.notifications
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_TELEGRAM_NOTIFICATIONS }
  const n = raw as Record<string, unknown>
  return {
    digest_enabled: n.digest_enabled === true,
    digest_hour_utc:
      typeof n.digest_hour_utc === 'number' && n.digest_hour_utc >= 0 && n.digest_hour_utc <= 23
        ? n.digest_hour_utc
        : DEFAULT_TELEGRAM_NOTIFICATIONS.digest_hour_utc,
    alert_deploy_fail: n.alert_deploy_fail !== false,
  }
}

export function mergeTelegramNotifications(
  metadata: Record<string, unknown>,
  patch: Partial<TelegramNotificationSettings>
): Record<string, unknown> {
  const current = parseTelegramNotifications(metadata)
  return {
    ...metadata,
    notifications: { ...current, ...patch },
  }
}
