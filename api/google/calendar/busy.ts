export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getGoogleAccessToken, listGoogleBusyEvents } from '../../_lib/google/calendarClient'
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
    const events = await listGoogleBusyEvents(accessToken, settings.calendar_id, timeMin, timeMax)

    const blocks = events.map((event) => ({
      id: event.id,
      title: event.summary ?? 'Busy',
      start: event.start?.dateTime ?? event.start?.date ?? timeMin,
      end: event.end?.dateTime ?? event.end?.date ?? timeMax,
      allDay: !!event.start?.date && !event.start?.dateTime,
      source: 'google_calendar' as const,
    }))

    return json({ blocks })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Busy fetch failed', 500)
  }
}
