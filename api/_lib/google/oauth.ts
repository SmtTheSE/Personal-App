const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ')

function oauthSecret() {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('GOOGLE_OAUTH_STATE_SECRET or SUPABASE_SERVICE_ROLE_KEY required')
  return secret
}

function googleClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required')
  }
  return { clientId, clientSecret }
}

export function getRedirectUri(requestUrl: string) {
  const configured = process.env.GOOGLE_REDIRECT_URI
  if (configured) return configured
  return `${new URL(requestUrl).origin}/api/google/calendar/callback`
}

async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(oauthSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function createOAuthState(userId: string): Promise<string> {
  const payload = JSON.stringify({
    userId,
    ts: Date.now(),
    nonce: crypto.randomUUID(),
  })
  const encoded = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const sig = await signPayload(encoded)
  return `${encoded}.${sig}`
}

export async function verifyOAuthState(state: string): Promise<{ userId: string } | null> {
  const [encoded, sig] = state.split('.')
  if (!encoded || !sig) return null

  const expected = await signPayload(encoded)
  if (sig !== expected) return null

  try {
    const json = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const body = JSON.parse(json) as { userId: string; ts: number }
    if (!body.userId || Date.now() - body.ts > 15 * 60 * 1000) return null
    return { userId: body.userId }
  } catch {
    return null
  }
}

export function buildGoogleAuthUrl(redirectUri: string, state: string) {
  const { clientId } = googleClientConfig()
  const url = new URL(GOOGLE_AUTH_URL)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GOOGLE_CALENDAR_SCOPES)
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  return url.toString()
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = googleClientConfig()
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Google token exchange failed: ${detail}`)
  }

  return res.json() as Promise<{
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
    token_type: string
  }>
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = googleClientConfig()
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Google token refresh failed: ${detail}`)
  }

  return res.json() as Promise<{
    access_token: string
    expires_in: number
    scope: string
    token_type: string
  }>
}

export async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const body = (await res.json()) as { email?: string }
  return body.email ?? null
}
