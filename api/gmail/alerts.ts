export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { checkGmailAlerts, listRecentSchoolEmails } from '../_lib/gmail/alertService.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    if (request.method === 'GET') {
      const recent = await listRecentSchoolEmails(user.id, 10)
      return json({ recent })
    }

    if (request.method === 'POST') {
      const result = await checkGmailAlerts(user.id)
      return json(result)
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Gmail alert check failed', 500)
  }
}
