export const config = { runtime: 'edge' }

import {
  exchangeGoogleCode,
  fetchGoogleEmail,
  getRedirectUri,
  verifyOAuthState,
} from '../../_lib/google/oauth'
import { mergeGoogleSettings, parseGoogleSettings } from '../../_lib/google/calendarClient'
import { fullCalendarSync } from '../../_lib/google/syncService'
import { getIntegration, upsertIntegration } from '../../_lib/integrations'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')
  const appOrigin = url.origin

  if (oauthError) {
    return Response.redirect(`${appOrigin}/settings?calendar=error&message=${encodeURIComponent(oauthError)}`, 302)
  }

  if (!code || !state) {
    return Response.redirect(`${appOrigin}/settings?calendar=error&message=missing_code`, 302)
  }

  try {
    const verified = await verifyOAuthState(state)
    if (!verified) {
      return Response.redirect(`${appOrigin}/settings?calendar=error&message=invalid_state`, 302)
    }

    const redirectUri = getRedirectUri(request.url)
    const tokens = await exchangeGoogleCode(code, redirectUri)
    const email = await fetchGoogleEmail(tokens.access_token)
    const existing = await getIntegration(verified.userId, 'google_calendar')
    const current = parseGoogleSettings(existing?.metadata ?? {})

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await upsertIntegration(verified.userId, 'google_calendar', {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
      metadata: mergeGoogleSettings(existing, {
        email,
        token_expires_at: tokenExpiresAt,
        sync_tasks: current.sync_tasks,
        sync_exams: current.sync_exams,
        calendar_id: current.calendar_id,
      }),
    })

    await fullCalendarSync(verified.userId).catch(() => {})

    return Response.redirect(`${appOrigin}/settings?calendar=connected`, 302)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'oauth_failed'
    return Response.redirect(`${appOrigin}/settings?calendar=error&message=${encodeURIComponent(message)}`, 302)
  }
}
