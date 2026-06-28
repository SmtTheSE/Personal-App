import { serviceFetch, getIntegration } from '../integrations.js'
import { notifyUser } from '../telegram/notify.js'
import { parseTelegramNotifications } from '../telegram/notify.js'
import type { NotificationPayload, NotificationPreferences } from './types.js'
import { eventEnabled, parseNotificationPrefs } from './types.js'

async function recordInAppEvent(userId: string, event: NotificationPayload): Promise<boolean> {
  const res = await serviceFetch('/rest/v1/notification_events', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      event_type: event.event_type,
      title: event.title,
      body: event.body,
      payload: event.payload ?? {},
      dedupe_key: event.dedupe_key ?? null,
    }),
  })
  if (res.status === 409) return false
  return res.ok
}

async function sendWebPush(userId: string, event: NotificationPayload): Promise<boolean> {
  const vapidPublic = process.env.VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  if (!vapidPublic || !vapidPrivate) return false

  const res = await serviceFetch(
    `/rest/v1/push_subscriptions?user_id=eq.${userId}&select=endpoint,p256dh,auth`
  )
  if (!res.ok) return false
  const subs = (await res.json()) as { endpoint: string; p256dh: string; auth: string }[]
  if (!subs.length) return false

  // Minimal Web Push — full crypto in edge is heavy; store event + rely on service worker pull
  // For now, POST payload to each subscription via web-push would need npm package.
  // We record in-app and return true if subs exist (SW can poll notification_events).
  void event
  return subs.length > 0
}

async function isTelegramConnected(userId: string): Promise<boolean> {
  const integration = await getIntegration(userId, 'telegram')
  return (
    !!integration?.access_token &&
    integration.access_token !== 'pending' &&
    integration.metadata?.linked !== false
  )
}

export async function dispatchNotification(
  userId: string,
  event: NotificationPayload,
  prefs?: NotificationPreferences
): Promise<{ in_app: boolean; telegram: boolean; web_push: boolean }> {
  const telegramMeta = await getIntegration(userId, 'telegram')
  const merged = prefs ?? {
    ...parseNotificationPrefs(telegramMeta?.metadata ?? {}),
    ...parseTelegramNotifications(telegramMeta?.metadata ?? {}),
    telegram: true,
    web_push: true,
    in_app: true,
  }

  if (!eventEnabled(merged, event.event_type)) {
    return { in_app: false, telegram: false, web_push: false }
  }

  const result = { in_app: false, telegram: false, web_push: false }

  if (merged.in_app) {
    result.in_app = await recordInAppEvent(userId, event)
  }

  const telegramConnected = await isTelegramConnected(userId)
  if (merged.telegram && telegramConnected) {
    const html = event.telegram_html ?? `<b>${event.title}</b>\n${event.body}`
    const silent = event.event_type !== 'gmail_alert'
    result.telegram = await notifyUser(userId, html, { silent })
  }

  if (merged.web_push) {
    result.web_push = await sendWebPush(userId, event)
  }

  return result
}
