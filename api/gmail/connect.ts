export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { buildGmailAuthUrl } from '../_lib/gmail/oauth'
import { errorResponse, json } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const url = await buildGmailAuthUrl(request.url, user.id)
    return json({ url })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Gmail connect failed', 500)
  }
}
