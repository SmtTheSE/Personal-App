import { getIntegration, upsertIntegration, type IntegrationRecord } from '../integrations.js'
import { refreshGoogleAccessToken } from './oauth.js'

export interface GoogleCalendarSettings {
  /** @deprecated Use export_calendar_id */
  calendar_id: string
  export_calendar_id: string
  import_calendar_ids: string[]
  sync_tasks: boolean
  sync_exams: boolean
  sync_focus_sessions: boolean
  travel_buffer_mins: number
  token_expires_at: string | null
  email: string | null
}

const DEFAULT_SETTINGS: GoogleCalendarSettings = {
  calendar_id: 'primary',
  export_calendar_id: 'primary',
  import_calendar_ids: ['primary'],
  sync_tasks: true,
  sync_exams: true,
  sync_focus_sessions: false,
  travel_buffer_mins: 0,
  token_expires_at: null,
  email: null,
}

function normalizeCalendarIds(value: unknown, fallback: string): string[] {
  if (!Array.isArray(value)) return [fallback]
  const ids = value.filter((id): id is string => typeof id === 'string' && id.length > 0)
  return ids.length ? [...new Set(ids)] : [fallback]
}

export function parseGoogleSettings(metadata: Record<string, unknown>): GoogleCalendarSettings {
  const exportId =
    typeof metadata.export_calendar_id === 'string'
      ? metadata.export_calendar_id
      : typeof metadata.calendar_id === 'string'
        ? metadata.calendar_id
        : DEFAULT_SETTINGS.export_calendar_id

  return {
    calendar_id: exportId,
    export_calendar_id: exportId,
    import_calendar_ids: normalizeCalendarIds(metadata.import_calendar_ids, exportId),
    sync_tasks: metadata.sync_tasks !== false,
    sync_exams: metadata.sync_exams !== false,
    sync_focus_sessions: metadata.sync_focus_sessions === true,
    travel_buffer_mins:
      typeof metadata.travel_buffer_mins === 'number' && metadata.travel_buffer_mins >= 0
        ? Math.min(metadata.travel_buffer_mins, 60)
        : 0,
    token_expires_at:
      typeof metadata.token_expires_at === 'string' ? metadata.token_expires_at : null,
    email: typeof metadata.email === 'string' ? metadata.email : null,
  }
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return true
  return Date.parse(expiresAt) <= Date.now() + 60_000
}

export async function getGoogleAccessToken(userId: string): Promise<{
  accessToken: string
  settings: GoogleCalendarSettings
}> {
  const integration = await getIntegration(userId, 'google_calendar')
  if (!integration?.access_token) {
    throw new Error('Google Calendar not connected')
  }

  const settings = parseGoogleSettings(integration.metadata ?? {})
  let accessToken = integration.access_token

  if (isExpired(settings.token_expires_at)) {
    if (!integration.refresh_token) {
      throw new Error('Google Calendar token expired. Reconnect in Settings.')
    }
    const refreshed = await refreshGoogleAccessToken(integration.refresh_token)
    accessToken = refreshed.access_token
    const tokenExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    await upsertIntegration(userId, 'google_calendar', {
      access_token: accessToken,
      refresh_token: integration.refresh_token,
      metadata: {
        ...integration.metadata,
        token_expires_at: tokenExpiresAt,
      },
    })
    settings.token_expires_at = tokenExpiresAt
  }

  return { accessToken, settings }
}

export interface GoogleCalendarEventPayload {
  summary: string
  description?: string
  location?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  extendedProperties?: { private?: Record<string, string> }
  colorId?: string
}

interface GoogleEventResponse {
  id: string
  etag?: string
}

export async function upsertGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string | null,
  payload: GoogleCalendarEventPayload
): Promise<string> {
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  const url = eventId ? `${base}/${encodeURIComponent(eventId)}` : base
  const method = eventId ? 'PATCH' : 'POST'

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Google Calendar API error: ${detail}`)
  }

  const body = (await res.json()) as GoogleEventResponse
  return body.id
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 404 || res.status === 410) return
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Google Calendar delete failed: ${detail}`)
  }
}

interface GoogleEventsListResponse {
  items?: Array<{
    id: string
    summary?: string
    location?: string
    htmlLink?: string
    start?: { date?: string; dateTime?: string }
    end?: { date?: string; dateTime?: string }
    extendedProperties?: { private?: Record<string, string> }
  }>
}

export interface GoogleCalendarListedEvent {
  id: string
  summary: string
  location: string | null
  htmlLink: string | null
  start: string
  end: string
  allDay: boolean
  calendarId: string
}

export async function listGoogleEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
  options?: { excludeNexus?: boolean }
) {
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`)
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '250')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Google Calendar list failed: ${detail}`)
  }

  const body = (await res.json()) as GoogleEventsListResponse
  const items = body.items ?? []
  const filtered = options?.excludeNexus !== false
    ? items.filter((item) => !item.extendedProperties?.private?.nexus_entity_id)
    : items

  return filtered.map((item) => ({
    id: `${calendarId}:${item.id}`,
    summary: item.summary ?? 'Event',
    location: item.location ?? null,
    htmlLink: item.htmlLink ?? null,
    start: item.start?.dateTime ?? item.start?.date ?? timeMin,
    end: item.end?.dateTime ?? item.end?.date ?? timeMax,
    allDay: !!item.start?.date && !item.start?.dateTime,
    calendarId,
  })) satisfies GoogleCalendarListedEvent[]
}

export async function listGoogleEventsFromCalendars(
  accessToken: string,
  calendarIds: string[],
  timeMin: string,
  timeMax: string,
  options?: { excludeNexus?: boolean }
): Promise<GoogleCalendarListedEvent[]> {
  const uniqueIds = [...new Set(calendarIds.filter(Boolean))]
  if (!uniqueIds.length) return []

  const batches = await Promise.all(
    uniqueIds.map((calendarId) =>
      listGoogleEvents(accessToken, calendarId, timeMin, timeMax, options).catch(() => [])
    )
  )

  return batches
    .flat()
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
}

export interface GoogleCalendarListEntry {
  id: string
  summary: string
  primary?: boolean
  backgroundColor?: string
}

export async function listGoogleCalendars(accessToken: string): Promise<GoogleCalendarListEntry[]> {
  const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader'
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Google Calendar list calendars failed: ${detail}`)
  }
  const body = (await res.json()) as {
    items?: Array<{ id: string; summary?: string; primary?: boolean; backgroundColor?: string }>
  }
  return (body.items ?? []).map((item) => ({
    id: item.id,
    summary: item.summary ?? item.id,
    primary: item.primary,
    backgroundColor: item.backgroundColor,
  }))
}

export async function listGoogleBusyEvents(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  return listGoogleEvents(accessToken, calendarId, timeMin, timeMax, { excludeNexus: true })
}

export function mergeGoogleSettings(
  existing: IntegrationRecord | null,
  patch: Partial<GoogleCalendarSettings>
): Record<string, unknown> {
  const current = parseGoogleSettings(existing?.metadata ?? {})
  const exportId = patch.export_calendar_id ?? patch.calendar_id ?? current.export_calendar_id

  return {
    ...(existing?.metadata ?? {}),
    calendar_id: exportId,
    export_calendar_id: exportId,
    import_calendar_ids: patch.import_calendar_ids ?? current.import_calendar_ids,
    sync_tasks: patch.sync_tasks ?? current.sync_tasks,
    sync_exams: patch.sync_exams ?? current.sync_exams,
    sync_focus_sessions: patch.sync_focus_sessions ?? current.sync_focus_sessions,
    travel_buffer_mins: patch.travel_buffer_mins ?? current.travel_buffer_mins,
    token_expires_at: patch.token_expires_at ?? current.token_expires_at,
    email: patch.email ?? current.email,
  }
}
