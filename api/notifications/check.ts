export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { runNotificationChecks } from '../_lib/notify/checks'
import { errorResponse, json } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const result = await runNotificationChecks(user.id)
    return json(result)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Notification check failed', 500)
  }
}
