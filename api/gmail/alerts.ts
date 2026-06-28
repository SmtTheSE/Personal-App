export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { checkGmailAlerts } from '../_lib/gmail/alertService.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const result = await checkGmailAlerts(user.id)
    return json(result)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Gmail alert check failed', 500)
  }
}
