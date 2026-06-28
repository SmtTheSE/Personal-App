import {
  createOAuthState,
  verifyOAuthState,
  exchangeGoogleCode,
  refreshGoogleAccessToken,
  fetchGoogleEmail,
} from '../google/oauth.js'
import { getIntegration, upsertIntegration } from '../integrations.js'
import { DEFAULT_ALERT_KEYWORDS } from './client.js'

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
].join(' ')

export const DEFAULT_GMAIL_LABEL = 'nexus/task'

export function getGmailRedirectUri(requestUrl: string) {
  const configured = process.env.GMAIL_REDIRECT_URI
  if (configured) return configured
  return `${new URL(requestUrl).origin}/api/gmail/callback`
}

export async function buildGmailAuthUrl(requestUrl: string, userId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID required')

  const state = await createOAuthState(userId)
  const redirectUri = getGmailRedirectUri(requestUrl)

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GMAIL_SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function completeGmailOAuth(code: string, redirectUri: string, userId: string) {
  const tokens = await exchangeGoogleCode(code, redirectUri)
  const email = await fetchGoogleEmail(tokens.access_token)
  const existing = await getIntegration(userId, 'gmail')
  await upsertIntegration(userId, 'gmail', {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
    metadata: {
      ...(existing?.metadata ?? {}),
      label_name: existing?.metadata?.label_name ?? DEFAULT_GMAIL_LABEL,
      email: email ?? existing?.metadata?.email ?? null,
      connected_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      alert_enabled: existing?.metadata?.alert_enabled ?? true,
      alert_keywords: existing?.metadata?.alert_keywords ?? DEFAULT_ALERT_KEYWORDS,
      last_alert_check_at: new Date().toISOString(),
    },
  })
}

export { verifyOAuthState, refreshGoogleAccessToken }
