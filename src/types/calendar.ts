export type CalendarEntityType = 'task' | 'exam'

export type CalendarSyncAction = 'full' | 'upsert' | 'delete'

export interface GoogleCalendarSettings {
  calendar_id?: string
  sync_tasks?: boolean
  sync_exams?: boolean
  token_expires_at?: string | null
  email?: string | null
}

export interface CalendarBusyBlock {
  id: string
  title: string
  start: string
  end: string
  allDay: boolean
  source: 'google_calendar'
}

export interface CalendarSyncResult {
  synced: number
  deleted: number
  skipped: number
  errors: string[]
}
