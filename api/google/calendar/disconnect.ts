export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { deleteIntegration, getIntegration, serviceFetch } from '../../_lib/integrations'
import { deleteGoogleEvent, getGoogleAccessToken } from '../../_lib/google/calendarClient'
import { errorResponse, json } from '../../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const integration = await getIntegration(user.id, 'google_calendar')
    if (integration) {
      try {
        const { accessToken, settings } = await getGoogleAccessToken(user.id)
        const mappingsRes = await serviceFetch(
          `/rest/v1/calendar_sync_mappings?user_id=eq.${user.id}&select=external_calendar_id,external_event_id`
        )
        if (mappingsRes.ok) {
          const mappings = (await mappingsRes.json()) as Array<{
            external_calendar_id: string
            external_event_id: string
          }>
          for (const mapping of mappings) {
            await deleteGoogleEvent(
              accessToken,
              mapping.external_calendar_id,
              mapping.external_event_id
            ).catch(() => {})
          }
        }
        void settings
      } catch {
        // Token may already be invalid; still remove local records.
      }
    }

    await serviceFetch(`/rest/v1/calendar_sync_mappings?user_id=eq.${user.id}`, { method: 'DELETE' })
    await deleteIntegration(user.id, 'google_calendar')

    return json({ disconnected: true })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Disconnect failed', 500)
  }
}
