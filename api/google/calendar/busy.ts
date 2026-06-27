export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getGoogleAccessToken, listGoogleEvents } from '../../_lib/google/calendarClient'
import { errorResponse, json } from '../../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const url = new URL(request.url)
    const timeMin = url.searchParams.get('timeMin')
    const timeMax = url.searchParams.get('timeMax')

    if (!timeMin || !timeMax) {
      return errorResponse('timeMin and timeMax query params required (ISO 8601)', 400)
    }

    const { accessToken, settings } = await getGoogleAccessToken(user.id)
    const events = await listGoogleEvents(accessToken, settings.calendar_id, timeMin, timeMax, {
      excludeNexus: true,
    })

    const blocks = events.map((event) => ({
      id: event.id,
      title: event.summary,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      location: event.location,
      htmlLink: event.htmlLink,
      source: 'google_calendar' as const,
    }))

    return json({ blocks })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Busy fetch failed', 500)
  }
}
