export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getIntegration, upsertIntegration } from '../../_lib/integrations'
import { mergeGoogleSettings, parseGoogleSettings } from '../../_lib/google/calendarClient'
import { errorResponse, json } from '../../_lib/http'

interface SettingsBody {
  sync_tasks?: boolean
  sync_exams?: boolean
  calendar_id?: string
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const body = (await request.json()) as SettingsBody
    const existing = await getIntegration(user.id, 'google_calendar')
    if (!existing?.access_token) {
      return errorResponse('Google Calendar not connected', 400)
    }

    const current = parseGoogleSettings(existing.metadata ?? {})
    const metadata = mergeGoogleSettings(existing, {
      sync_tasks: body.sync_tasks ?? current.sync_tasks,
      sync_exams: body.sync_exams ?? current.sync_exams,
      calendar_id: body.calendar_id ?? current.calendar_id,
    })

    await upsertIntegration(user.id, 'google_calendar', {
      access_token: existing.access_token,
      refresh_token: existing.refresh_token,
      metadata,
    })

    return json({ settings: parseGoogleSettings(metadata) })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Settings update failed', 500)
  }
}
