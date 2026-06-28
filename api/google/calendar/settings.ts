export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth.js'
import { getIntegration, upsertIntegration } from '../../_lib/integrations.js'
import { mergeGoogleSettings, parseGoogleSettings } from '../../_lib/google/calendarClient.js'
import { errorResponse, json } from '../../_lib/http.js'

interface SettingsBody {
  sync_tasks?: boolean
  sync_exams?: boolean
  sync_focus_sessions?: boolean
  calendar_id?: string
  export_calendar_id?: string
  import_calendar_ids?: string[]
  travel_buffer_mins?: number
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
      sync_focus_sessions: body.sync_focus_sessions ?? current.sync_focus_sessions,
      calendar_id: body.calendar_id ?? body.export_calendar_id ?? current.export_calendar_id,
      export_calendar_id: body.export_calendar_id ?? body.calendar_id ?? current.export_calendar_id,
      import_calendar_ids: body.import_calendar_ids ?? current.import_calendar_ids,
      travel_buffer_mins: body.travel_buffer_mins ?? current.travel_buffer_mins,
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
