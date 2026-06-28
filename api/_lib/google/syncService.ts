import {
  deleteGoogleEvent,
  getGoogleAccessToken,
  parseGoogleSettings,
  upsertGoogleEvent,
  type GoogleCalendarEventPayload,
} from './calendarClient'
import { getIntegration, serviceFetch } from '../integrations'

export type CalendarEntityType = 'task' | 'exam' | 'focus_session'

interface TaskRow {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: string
  status: string
  due_date: string | null
  project_id: string | null
}

interface ExamRow {
  id: string
  user_id: string
  title: string
  course: string | null
  exam_at: string
  location: string | null
  notes: string | null
  color: string
}

interface StudySessionRow {
  id: string
  user_id: string
  topic: string
  duration_mins: number
  project_id: string | null
  session_type?: string
  started_at: string
}

interface SyncMapping {
  id: string
  entity_type: CalendarEntityType
  entity_id: string
  external_calendar_id: string
  external_event_id: string
  content_hash: string
}

function exportCalendarId(settings: ReturnType<typeof parseGoogleSettings>) {
  return settings.export_calendar_id || settings.calendar_id
}

function focusSessionPayload(session: StudySessionRow): GoogleCalendarEventPayload | null {
  if ((session.session_type ?? 'focus') !== 'focus') return null
  const start = new Date(session.started_at)
  const end = new Date(start.getTime() + session.duration_mins * 60 * 1000)
  return {
    summary: `[Nexus] Focus: ${session.topic}`,
    description: `${session.duration_mins} minute focus session`,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    extendedProperties: {
      private: {
        nexus_entity_type: 'focus_session',
        nexus_entity_id: session.id,
        nexus_app: 'nexus-student-os',
      },
    },
    colorId: '10',
  }
}

async function fetchStudySession(userId: string, sessionId: string): Promise<StudySessionRow | null> {
  const res = await serviceFetch(
    `/rest/v1/study_sessions?user_id=eq.${userId}&id=eq.${sessionId}&select=id,user_id,topic,duration_mins,project_id,session_type,started_at&limit=1`
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as StudySessionRow[]
  return rows[0] ?? null
}

async function fetchStudySessions(userId: string): Promise<StudySessionRow[]> {
  const res = await serviceFetch(
    `/rest/v1/study_sessions?user_id=eq.${userId}&select=id,user_id,topic,duration_mins,project_id,session_type,started_at&order=started_at.desc&limit=200`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function hashContent(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function examColorId(color: string): string | undefined {
  const map: Record<string, string> = {
    blue: '9',
    green: '10',
    purple: '3',
    orange: '6',
    red: '11',
  }
  return map[color]
}

function taskPayload(task: TaskRow): GoogleCalendarEventPayload | null {
  if (!task.due_date || task.status === 'done') return null
  const due = task.due_date.split('T')[0]
  return {
    summary: `[Nexus] ${task.title}`,
    description: task.description ?? `Priority: ${task.priority}`,
    start: { date: due },
    end: { date: due },
    extendedProperties: {
      private: {
        nexus_entity_type: 'task',
        nexus_entity_id: task.id,
        nexus_app: 'nexus-student-os',
      },
    },
    colorId: '9',
  }
}

function examPayload(exam: ExamRow): GoogleCalendarEventPayload {
  const start = new Date(exam.exam_at)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)
  return {
    summary: `[Nexus] Exam: ${exam.title}`,
    description: [exam.course, exam.notes].filter(Boolean).join('\n') || undefined,
    location: exam.location ?? undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
    extendedProperties: {
      private: {
        nexus_entity_type: 'exam',
        nexus_entity_id: exam.id,
        nexus_app: 'nexus-student-os',
      },
    },
    colorId: examColorId(exam.color),
  }
}

async function fetchMapping(
  userId: string,
  entityType: CalendarEntityType,
  entityId: string
): Promise<SyncMapping | null> {
  const res = await serviceFetch(
    `/rest/v1/calendar_sync_mappings?user_id=eq.${userId}&entity_type=eq.${entityType}&entity_id=eq.${entityId}&select=*&limit=1`
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as SyncMapping[]
  return rows[0] ?? null
}

async function upsertMapping(
  userId: string,
  entityType: CalendarEntityType,
  entityId: string,
  calendarId: string,
  eventId: string,
  contentHash: string
) {
  const res = await serviceFetch('/rest/v1/calendar_sync_mappings', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      provider: 'google_calendar',
      entity_type: entityType,
      entity_id: entityId,
      external_calendar_id: calendarId,
      external_event_id: eventId,
      content_hash: contentHash,
      last_synced_at: new Date().toISOString(),
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function deleteMapping(userId: string, entityType: CalendarEntityType, entityId: string) {
  const res = await serviceFetch(
    `/rest/v1/calendar_sync_mappings?user_id=eq.${userId}&entity_type=eq.${entityType}&entity_id=eq.${entityId}`,
    { method: 'DELETE' }
  )
  if (!res.ok) throw new Error(await res.text())
}

async function fetchTasks(userId: string): Promise<TaskRow[]> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&select=id,user_id,title,description,priority,status,due_date,project_id`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fetchTask(userId: string, taskId: string): Promise<TaskRow | null> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&id=eq.${taskId}&select=id,user_id,title,description,priority,status,due_date,project_id&limit=1`
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as TaskRow[]
  return rows[0] ?? null
}

async function fetchExams(userId: string): Promise<ExamRow[]> {
  const res = await serviceFetch(
    `/rest/v1/exams?user_id=eq.${userId}&select=id,user_id,title,course,exam_at,location,notes,color`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fetchExam(userId: string, examId: string): Promise<ExamRow | null> {
  const res = await serviceFetch(
    `/rest/v1/exams?user_id=eq.${userId}&id=eq.${examId}&select=id,user_id,title,course,exam_at,location,notes,color&limit=1`
  )
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as ExamRow[]
  return rows[0] ?? null
}

async function removeEntityEvent(
  userId: string,
  accessToken: string,
  entityType: CalendarEntityType,
  entityId: string
) {
  const mapping = await fetchMapping(userId, entityType, entityId)
  if (!mapping) return

  await deleteGoogleEvent(accessToken, mapping.external_calendar_id, mapping.external_event_id)
  await deleteMapping(userId, entityType, entityId)
}

export async function syncTask(userId: string, taskId: string, accessToken?: string, calendarId?: string) {
  const integration = await getIntegration(userId, 'google_calendar')
  const settings = parseGoogleSettings(integration?.metadata ?? {})
  if (!settings.sync_tasks) return { action: 'skipped' as const }

  const auth = accessToken && calendarId
    ? { accessToken, settings: { ...settings, calendar_id: calendarId } }
    : await getGoogleAccessToken(userId)

  const task = await fetchTask(userId, taskId)
  if (!task) {
    await removeEntityEvent(userId, auth.accessToken, 'task', taskId)
    return { action: 'deleted' as const }
  }

  const payload = taskPayload(task)
  if (!payload) {
    await removeEntityEvent(userId, auth.accessToken, 'task', taskId)
    return { action: 'deleted' as const }
  }

  const contentHash = await hashContent(JSON.stringify(payload))
  const mapping = await fetchMapping(userId, 'task', taskId)
  if (mapping?.content_hash === contentHash) return { action: 'unchanged' as const }

  const calId = exportCalendarId(auth.settings)
  const eventId = await upsertGoogleEvent(
    auth.accessToken,
    calId,
    mapping?.external_event_id ?? null,
    payload
  )

  await upsertMapping(userId, 'task', taskId, calId, eventId, contentHash)
  return { action: 'synced' as const }
}

export async function syncExam(userId: string, examId: string, accessToken?: string, calendarId?: string) {
  const integration = await getIntegration(userId, 'google_calendar')
  const settings = parseGoogleSettings(integration?.metadata ?? {})
  if (!settings.sync_exams) return { action: 'skipped' as const }

  const auth = accessToken && calendarId
    ? { accessToken, settings: { ...settings, calendar_id: calendarId } }
    : await getGoogleAccessToken(userId)

  const exam = await fetchExam(userId, examId)
  if (!exam) {
    await removeEntityEvent(userId, auth.accessToken, 'exam', examId)
    return { action: 'deleted' as const }
  }

  const payload = examPayload(exam)
  const contentHash = await hashContent(JSON.stringify(payload))
  const mapping = await fetchMapping(userId, 'exam', examId)
  if (mapping?.content_hash === contentHash) return { action: 'unchanged' as const }

  const calId = exportCalendarId(auth.settings)
  const eventId = await upsertGoogleEvent(
    auth.accessToken,
    calId,
    mapping?.external_event_id ?? null,
    payload
  )

  await upsertMapping(userId, 'exam', examId, calId, eventId, contentHash)
  return { action: 'synced' as const }
}

export async function syncFocusSession(
  userId: string,
  sessionId: string,
  accessToken?: string,
  calendarId?: string
) {
  const integration = await getIntegration(userId, 'google_calendar')
  const settings = parseGoogleSettings(integration?.metadata ?? {})
  if (!settings.sync_focus_sessions) return { action: 'skipped' as const }

  const auth = accessToken && calendarId
    ? { accessToken, settings: { ...settings, export_calendar_id: calendarId, calendar_id: calendarId } }
    : await getGoogleAccessToken(userId)

  const session = await fetchStudySession(userId, sessionId)
  if (!session) {
    await removeEntityEvent(userId, auth.accessToken, 'focus_session', sessionId)
    return { action: 'deleted' as const }
  }

  const payload = focusSessionPayload(session)
  if (!payload) return { action: 'skipped' as const }

  const contentHash = await hashContent(JSON.stringify(payload))
  const mapping = await fetchMapping(userId, 'focus_session', sessionId)
  if (mapping?.content_hash === contentHash) return { action: 'unchanged' as const }

  const calId = exportCalendarId(auth.settings)
  const eventId = await upsertGoogleEvent(
    auth.accessToken,
    calId,
    mapping?.external_event_id ?? null,
    payload
  )

  await upsertMapping(userId, 'focus_session', sessionId, calId, eventId, contentHash)
  return { action: 'synced' as const }
}

export async function deleteSyncedEntity(
  userId: string,
  entityType: CalendarEntityType,
  entityId: string
) {
  const { accessToken, settings } = await getGoogleAccessToken(userId)
  await removeEntityEvent(userId, accessToken, entityType, entityId)
  return settings
}

export async function fullCalendarSync(userId: string) {
  const { accessToken, settings } = await getGoogleAccessToken(userId)
  const result = { synced: 0, deleted: 0, skipped: 0, errors: [] as string[] }

  const calId = exportCalendarId(settings)

  if (settings.sync_tasks) {
    const tasks = await fetchTasks(userId)
    for (const task of tasks) {
      try {
        const out = await syncTask(userId, task.id, accessToken, calId)
        if (out.action === 'synced') result.synced++
        else if (out.action === 'deleted') result.deleted++
        else result.skipped++
      } catch (err) {
        result.errors.push(`task ${task.id}: ${err instanceof Error ? err.message : 'sync failed'}`)
      }
    }
  }

  if (settings.sync_exams) {
    const exams = await fetchExams(userId)
    for (const exam of exams) {
      try {
        const out = await syncExam(userId, exam.id, accessToken, calId)
        if (out.action === 'synced') result.synced++
        else if (out.action === 'deleted') result.deleted++
        else result.skipped++
      } catch (err) {
        result.errors.push(`exam ${exam.id}: ${err instanceof Error ? err.message : 'sync failed'}`)
      }
    }
  }

  if (settings.sync_focus_sessions) {
    const sessions = await fetchStudySessions(userId)
    for (const session of sessions) {
      try {
        const out = await syncFocusSession(userId, session.id, accessToken, calId)
        if (out.action === 'synced') result.synced++
        else if (out.action === 'deleted') result.deleted++
        else result.skipped++
      } catch (err) {
        result.errors.push(`focus ${session.id}: ${err instanceof Error ? err.message : 'sync failed'}`)
      }
    }
  }

  return result
}
