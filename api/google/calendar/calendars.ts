export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getGoogleAccessToken, listGoogleCalendars } from '../../_lib/google/calendarClient'
import { errorResponse, json } from '../../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const { accessToken } = await getGoogleAccessToken(user.id)
    const calendars = await listGoogleCalendars(accessToken)
    return json({ calendars })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Failed to list calendars', 500)
  }
}
