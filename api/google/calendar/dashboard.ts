export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import { getIntegration, serviceFetch } from '../../_lib/integrations'
import {
  getGoogleAccessToken,
  listGoogleBusyEvents,
  parseGoogleSettings,
} from '../../_lib/google/calendarClient'
import { errorResponse, json } from '../../_lib/http'

interface SyncMappingRow {
  entity_type: 'task' | 'exam'
  entity_id: string
  last_synced_at: string
}

interface TaskRow {
  id: string
  title: string
  due_date: string | null
  status: string
}

interface ExamRow {
  id: string
  title: string
  exam_at: string
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const integration = await getIntegration(user.id, 'google_calendar')
    if (!integration?.access_token) {
      return json({
        connected: false,
        email: null,
        calendar_id: 'primary',
        sync_tasks: true,
        sync_exams: true,
        connected_at: null,
        stats: {
          syncedTasks: 0,
          syncedExams: 0,
          totalMappings: 0,
          eligibleTasks: 0,
          eligibleExams: 0,
          busyThisWeek: 0,
          lastSyncedAt: null,
        },
        upcomingBusy: [],
        recentSync: [],
      })
    }

    const settings = parseGoogleSettings(integration.metadata ?? {})

    const [tasksRes, examsRes, mappingsRes] = await Promise.all([
      serviceFetch(
        `/rest/v1/tasks?user_id=eq.${user.id}&select=id,title,due_date,status`
      ),
      serviceFetch(
        `/rest/v1/exams?user_id=eq.${user.id}&select=id,title,exam_at`
      ),
      serviceFetch(
        `/rest/v1/calendar_sync_mappings?user_id=eq.${user.id}&select=entity_type,entity_id,last_synced_at&order=last_synced_at.desc`
      ),
    ])

    if (!tasksRes.ok) throw new Error(await tasksRes.text())
    if (!examsRes.ok) throw new Error(await examsRes.text())
    if (!mappingsRes.ok) throw new Error(await mappingsRes.text())

    const tasks = (await tasksRes.json()) as TaskRow[]
    const exams = (await examsRes.json()) as ExamRow[]
    const mappings = (await mappingsRes.json()) as SyncMappingRow[]

    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    const examMap = new Map(exams.map((e) => [e.id, e]))

    const syncedTasks = mappings.filter((m) => m.entity_type === 'task').length
    const syncedExams = mappings.filter((m) => m.entity_type === 'exam').length
    const eligibleTasks = tasks.filter((t) => t.due_date && t.status !== 'done').length
    const eligibleExams = exams.length
    const lastSyncedAt = mappings[0]?.last_synced_at ?? null

    const recentSync = mappings.slice(0, 12).map((m) => {
      if (m.entity_type === 'task') {
        const task = taskMap.get(m.entity_id)
        return {
          entity_type: m.entity_type,
          entity_id: m.entity_id,
          title: task?.title ?? 'Task',
          scheduled_at: task?.due_date ?? null,
          last_synced_at: m.last_synced_at,
        }
      }
      const exam = examMap.get(m.entity_id)
      return {
        entity_type: m.entity_type,
        entity_id: m.entity_id,
        title: exam?.title ?? 'Exam',
        scheduled_at: exam?.exam_at ?? null,
        last_synced_at: m.last_synced_at,
      }
    })

    const now = new Date()
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() + 7)

    let upcomingBusy: Array<{
      id: string
      title: string
      start: string
      end: string
      allDay: boolean
      source: 'google_calendar'
    }> = []
    let busyThisWeek = 0

    try {
      const { accessToken, settings: authSettings } = await getGoogleAccessToken(user.id)
      const events = await listGoogleBusyEvents(
        accessToken,
        authSettings.calendar_id,
        now.toISOString(),
        weekEnd.toISOString()
      )
      busyThisWeek = events.length
      upcomingBusy = events.slice(0, 8).map((event) => ({
        id: event.id,
        title: event.summary,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        location: event.location,
        htmlLink: event.htmlLink,
        source: 'google_calendar' as const,
      }))
    } catch {
      // Token may be invalid; dashboard still shows sync stats.
    }

    return json({
      connected: true,
      email: settings.email,
      calendar_id: settings.calendar_id,
      sync_tasks: settings.sync_tasks,
      sync_exams: settings.sync_exams,
      connected_at: integration.updated_at,
      stats: {
        syncedTasks,
        syncedExams,
        totalMappings: mappings.length,
        eligibleTasks,
        eligibleExams,
        busyThisWeek,
        lastSyncedAt,
      },
      upcomingBusy,
      recentSync,
    })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Dashboard failed', 500)
  }
}
