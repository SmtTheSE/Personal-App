import { getIntegration, upsertIntegration } from '../integrations.js'
import { dispatchNotification } from '../notify/hub.js'
import {
  buildAlertSearchQuery,
  extractGmailBody,
  formatTelegramEmailAlert,
  getGmailAccessToken,
  gmailFetch,
  GmailFullMessage,
  normalizeEmailBody,
  parseGmailAlertSettings,
  readGmailHeader,
} from './client.js'

export interface GmailRecentEmail {
  id: string
  thread_id: string
  subject: string
  from: string
  snippet: string
  body: string
  received_at: string
}

interface GmailListResponse {
  messages?: { id: string }[]
}

function toRecentEmail(full: GmailFullMessage): GmailRecentEmail {
  const internalMs = full.internalDate ? Number(full.internalDate) : Date.now()
  const bodyRaw = extractGmailBody(full.payload ?? {}) || full.snippet || ''
  return {
    id: full.id,
    thread_id: full.threadId,
    subject: readGmailHeader(full, 'Subject') || full.snippet || '(No subject)',
    from: readGmailHeader(full, 'From') || 'Unknown sender',
    snippet: full.snippet?.slice(0, 200) ?? '',
    body: normalizeEmailBody(bodyRaw),
    received_at: new Date(internalMs).toISOString(),
  }
}

async function fetchMessageDetails(
  accessToken: string,
  items: { id: string }[]
): Promise<GmailFullMessage[]> {
  const results: GmailFullMessage[] = []
  for (const item of items) {
    try {
      const full = (await gmailFetch(
        accessToken,
        `/messages/${item.id}?format=full`
      )) as GmailFullMessage
      results.push(full)
    } catch (err) {
      console.error(`Failed to load Gmail message ${item.id}:`, err)
    }
  }
  return results
}

export async function listRecentSchoolEmails(userId: string, maxResults = 10): Promise<GmailRecentEmail[]> {
  const accessToken = await getGmailAccessToken(userId)
  if (!accessToken) return []

  const integration = await getIntegration(userId, 'gmail')
  if (!integration) return []

  const settings = parseGmailAlertSettings(integration.metadata ?? {})
  const query = buildAlertSearchQuery(settings.alert_keywords)

  const list = (await gmailFetch(
    accessToken,
    `/messages?q=${encodeURIComponent(query)}&maxResults=${Math.min(maxResults, 20)}`
  )) as GmailListResponse

  const messages = await fetchMessageDetails(accessToken, list.messages ?? [])
  return messages
    .map(toRecentEmail)
    .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
    .slice(0, maxResults)
}

export async function checkGmailAlerts(userId: string) {
  const accessToken = await getGmailAccessToken(userId)
  if (!accessToken) return { notified: 0, checked: 0, recent: [], skipped: 'not_connected' as const }

  const integration = await getIntegration(userId, 'gmail')
  if (!integration) return { notified: 0, checked: 0, recent: [], skipped: 'not_connected' as const }

  const settings = parseGmailAlertSettings(integration.metadata ?? {})
  if (!settings.alert_enabled) {
    const recent = await listRecentSchoolEmails(userId, 10)
    return { notified: 0, checked: recent.length, recent, skipped: 'disabled' as const }
  }

  const baseline = settings.last_alert_check_at
    ?? (integration.metadata?.connected_at as string | undefined)
    ?? new Date().toISOString()
  const baselineMs = new Date(baseline).getTime()

  const recent = await listRecentSchoolEmails(userId, 10)
  let notified = 0

  for (const email of recent) {
    const receivedMs = new Date(email.received_at).getTime()
    if (receivedMs <= baselineMs) continue

    try {
      const result = await dispatchNotification(userId, {
        event_type: 'gmail_alert',
        title: email.subject,
        body: `${email.from}\n\n${email.body || email.snippet}`,
        dedupe_key: `gmail_alert:${email.id}`,
        payload: {
          message_id: email.id,
          thread_id: email.thread_id,
          from: email.from,
          subject: email.subject,
          content: email.body,
          snippet: email.snippet,
          alert: true,
        },
        telegram_html: formatTelegramEmailAlert(email),
      })

      if (result.in_app || result.telegram || result.web_push) notified++
    } catch (err) {
      console.error(`Gmail alert notify failed for ${email.id}:`, err)
    }
  }

  await upsertIntegration(userId, 'gmail', {
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    metadata: {
      ...integration.metadata,
      last_alert_check_at: new Date().toISOString(),
      last_alert_stats: { notified, checked: recent.length },
      recent_school_emails: recent,
    },
  })

  return { notified, checked: recent.length, recent }
}
