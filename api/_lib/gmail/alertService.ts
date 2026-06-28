import { getIntegration, upsertIntegration } from '../integrations.js'
import { dispatchNotification } from '../notify/hub.js'
import {
  buildAlertSearchQuery,
  escapeHtml,
  getGmailAccessToken,
  gmailFetch,
  parseGmailAlertSettings,
} from './client.js'

interface GmailListResponse {
  messages?: { id: string }[]
}

interface GmailMessageMeta {
  id: string
  threadId: string
  snippet: string
  internalDate?: string
  payload?: { headers?: { name: string; value: string }[] }
}

function readHeader(message: GmailMessageMeta, name: string): string {
  const headers = message.payload?.headers ?? []
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

export async function checkGmailAlerts(userId: string) {
  const accessToken = await getGmailAccessToken(userId)
  if (!accessToken) return { notified: 0, checked: 0, skipped: 'not_connected' as const }

  const integration = await getIntegration(userId, 'gmail')
  if (!integration) return { notified: 0, checked: 0, skipped: 'not_connected' as const }

  const settings = parseGmailAlertSettings(integration.metadata ?? {})
  if (!settings.alert_enabled) return { notified: 0, checked: 0, skipped: 'disabled' as const }

  const baseline = settings.last_alert_check_at
    ?? (integration.metadata?.connected_at as string | undefined)
    ?? new Date().toISOString()
  const afterDate = new Date(baseline)
  const query = buildAlertSearchQuery(settings.alert_keywords, afterDate)

  const list = (await gmailFetch(
    accessToken,
    `/messages?q=${encodeURIComponent(query)}&maxResults=15`
  )) as GmailListResponse

  const messages = list.messages ?? []
  let notified = 0
  const baselineMs = afterDate.getTime()

  for (const item of messages) {
    try {
      const full = (await gmailFetch(
        accessToken,
        `/messages/${item.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`
      )) as GmailMessageMeta

      const internalMs = full.internalDate ? Number(full.internalDate) : 0
      if (internalMs && internalMs <= baselineMs) continue

      const subject = readHeader(full, 'Subject') || full.snippet || 'New email'
      const from = readHeader(full, 'From') || 'Unknown sender'
      const preview = full.snippet?.slice(0, 160) ?? ''

      const result = await dispatchNotification(userId, {
        event_type: 'gmail_alert',
        title: subject,
        body: `${from}\n${preview}`,
        dedupe_key: `gmail_alert:${item.id}`,
        payload: {
          message_id: item.id,
          thread_id: full.threadId,
          from,
          subject,
          alert: true,
        },
        telegram_html: `📬 <b>${escapeHtml(subject)}</b>\n${escapeHtml(from)}\n<i>${escapeHtml(preview)}</i>`,
      })

      if (result.in_app || result.telegram || result.web_push) notified++
    } catch (err) {
      console.error(`Gmail alert check failed for ${item.id}:`, err)
    }
  }

  await upsertIntegration(userId, 'gmail', {
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    metadata: {
      ...integration.metadata,
      last_alert_check_at: new Date().toISOString(),
      last_alert_stats: { notified, checked: messages.length },
    },
  })

  return { notified, checked: messages.length }
}
