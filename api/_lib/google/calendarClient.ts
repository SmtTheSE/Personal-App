import { getIntegration, upsertIntegration, type IntegrationRecord } from '../integrations'
import { refreshGoogleAccessToken } from './oauth'

export interface GoogleCalendarSettings {
  calendar_id: string
  sync_tasks: boolean
  sync_exams: boolean
  token_expires_at: string | null
  email: string | null
}

const DEFAULT_SETTINGS: GoogleCalendarSettings = {
  calendar_id: 'primary',
  sync_tasks: true,
  sync_exams: true,
  token_expires_at: null,
  email: null,
}

export function parseGoogleSettings(metadata: Record<string, unknown>): GoogleCalendarSettings {
  return {
    calendar_id: typeof metadata.calendar_id === 'string' ? metadata.calendar_id : DEFAULT_SETTINGS.calendar_id,
    sync_tasks: metadata.sync_tasks !== false,
    sync_exams: metadata.sync_exams !== false,
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
    id: item.id,
    summary: item.summary ?? 'Event',
    location: item.location ?? null,
    htmlLink: item.htmlLink ?? null,
    start: item.start?.dateTime ?? item.start?.date ?? timeMin,
    end: item.end?.dateTime ?? item.end?.date ?? timeMax,
    allDay: !!item.start?.date && !item.start?.dateTime,
  })) satisfies GoogleCalendarListedEvent[]
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
  return {
    ...(existing?.metadata ?? {}),
    calendar_id: patch.calendar_id ?? current.calendar_id,
    sync_tasks: patch.sync_tasks ?? current.sync_tasks,
    sync_exams: patch.sync_exams ?? current.sync_exams,
    token_expires_at: patch.token_expires_at ?? current.token_expires_at,
    email: patch.email ?? current.email,
  }
}
