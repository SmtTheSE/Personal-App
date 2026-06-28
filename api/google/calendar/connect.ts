export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth.js'
import { buildGoogleAuthUrl, createOAuthState, getRedirectUri } from '../../_lib/google/oauth.js'
import { errorResponse, json } from '../../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const state = await createOAuthState(user.id)
    const redirectUri = getRedirectUri(request.url)
    const url = buildGoogleAuthUrl(redirectUri, state)
    return json({ url })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'OAuth init failed', 500)
  }
}
