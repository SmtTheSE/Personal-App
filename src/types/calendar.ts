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
  location?: string | null
  htmlLink?: string | null
  source: 'google_calendar'
}

export interface CalendarSyncResult {
  synced: number
  deleted: number
  skipped: number
  errors: string[]
}

export interface CalendarSyncedItem {
  entity_type: CalendarEntityType
  entity_id: string
  title: string
  scheduled_at: string | null
  last_synced_at: string
}

export interface CalendarDashboardStats {
  syncedTasks: number
  syncedExams: number
  totalMappings: number
  eligibleTasks: number
  eligibleExams: number
  busyThisWeek: number
  lastSyncedAt: string | null
}

export interface CalendarDashboard {
  connected: boolean
  email: string | null
  calendar_id: string
  sync_tasks: boolean
  sync_exams: boolean
  connected_at: string | null
  stats: CalendarDashboardStats
  upcomingBusy: CalendarBusyBlock[]
  recentSync: CalendarSyncedItem[]
}
