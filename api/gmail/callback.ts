export const config = { runtime: 'edge' }

import { completeGmailOAuth, getGmailRedirectUri, verifyOAuthState } from '../_lib/gmail/oauth'
import { errorResponse } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const origin = url.origin

  if (!code || !state) {
    return Response.redirect(`${origin}/settings?gmail=error&message=Missing+OAuth+params`, 302)
  }

  try {
    const verified = await verifyOAuthState(state)
    if (!verified) {
      return Response.redirect(`${origin}/settings?gmail=error&message=Invalid+state`, 302)
    }

    const redirectUri = getGmailRedirectUri(request.url)
    await completeGmailOAuth(code, redirectUri, verified.userId)
    return Response.redirect(`${origin}/settings?gmail=connected`, 302)
  } catch (err) {
    const message = encodeURIComponent(err instanceof Error ? err.message : 'OAuth failed')
    return Response.redirect(`${origin}/settings?gmail=error&message=${message}`, 302)
  }
}
