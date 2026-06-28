import { getIntegration, upsertIntegration } from '../integrations.js'
import { refreshGoogleAccessToken } from '../google/oauth.js'

export const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export const DEFAULT_ALERT_KEYWORDS = ['Saigon Business School']

export interface GmailAlertSettings {
  alert_enabled: boolean
  alert_keywords: string[]
  last_alert_check_at: string | null
}

export function parseGmailAlertSettings(metadata: Record<string, unknown>): GmailAlertSettings {
  const rawKeywords = metadata.alert_keywords
  const keywords = Array.isArray(rawKeywords)
    ? rawKeywords.filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
    : DEFAULT_ALERT_KEYWORDS

  return {
    alert_enabled: metadata.alert_enabled !== false,
    alert_keywords: keywords.length ? keywords : DEFAULT_ALERT_KEYWORDS,
    last_alert_check_at: typeof metadata.last_alert_check_at === 'string' ? metadata.last_alert_check_at : null,
  }
}

export async function getGmailAccessToken(userId: string): Promise<string | null> {
  const row = await getIntegration(userId, 'gmail')
  if (!row?.access_token) return null

  const expiresAt = row.metadata?.expires_at as string | undefined
  if (expiresAt && Date.now() < new Date(expiresAt).getTime() - 60_000) {
    return row.access_token
  }

  if (!row.refresh_token) return row.access_token

  const refreshed = await refreshGoogleAccessToken(row.refresh_token)
  await upsertIntegration(userId, 'gmail', {
    access_token: refreshed.access_token,
    refresh_token: row.refresh_token,
    metadata: {
      ...row.metadata,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    },
  })
  return refreshed.access_token
}

export async function gmailFetch(accessToken: string, path: string) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export function formatGmailAfter(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}/${m}/${d}`
}

export function buildAlertSearchQuery(keywords: string[], after?: Date): string {
  const parts = keywords.map((keyword) => {
    const trimmed = keyword.trim()
    const quoted = trimmed.includes(' ') ? `"${trimmed}"` : trimmed
    return `(from:${quoted} OR subject:${quoted} OR ${quoted})`
  })
  let query = `(${parts.join(' OR ')}) in:inbox`
  if (after) query += ` after:${formatGmailAfter(after)}`
  return query
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
