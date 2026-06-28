import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { fetchBusyBlocks, requestFullCalendarSync } from '@/lib/calendar/syncClient'
import type {
  CalendarBusyBlock,
  CalendarDashboard,
  GoogleCalendarSettings,
} from '@/types/calendar'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

function parseSettings(metadata: Record<string, unknown>): GoogleCalendarSettings {
  const exportId =
    typeof metadata.export_calendar_id === 'string'
      ? metadata.export_calendar_id
      : typeof metadata.calendar_id === 'string'
        ? metadata.calendar_id
        : 'primary'
  const importIds = Array.isArray(metadata.import_calendar_ids)
    ? metadata.import_calendar_ids.filter((id): id is string => typeof id === 'string')
    : [exportId]

  return {
    calendar_id: exportId,
    export_calendar_id: exportId,
    import_calendar_ids: importIds.length ? importIds : [exportId],
    sync_tasks: metadata.sync_tasks !== false,
    sync_exams: metadata.sync_exams !== false,
    sync_focus_sessions: metadata.sync_focus_sessions === true,
    travel_buffer_mins:
      typeof metadata.travel_buffer_mins === 'number' ? metadata.travel_buffer_mins : 0,
    email: typeof metadata.email === 'string' ? metadata.email : null,
    token_expires_at:
      typeof metadata.token_expires_at === 'string' ? metadata.token_expires_at : null,
  }
}

export const useGoogleCalendarStore = defineStore('googleCalendar', () => {
  const connected = ref(false)
  const settings = ref<GoogleCalendarSettings>({
    sync_tasks: true,
    sync_exams: true,
    sync_focus_sessions: false,
    travel_buffer_mins: 0,
    calendar_id: 'primary',
    export_calendar_id: 'primary',
    import_calendar_ids: ['primary'],
    email: null,
    token_expires_at: null,
  })
  const googleEvents = ref<CalendarBusyBlock[]>([])
  const dashboard = ref<CalendarDashboard | null>(null)
  const loading = ref(false)
  const dashboardLoading = ref(false)
  const syncing = ref(false)

  const email = computed(() => settings.value.email ?? null)

  async function loadStatus() {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('metadata, updated_at')
      .eq('provider', 'google_calendar')
      .maybeSingle()

    if (error) throw error
    connected.value = !!data
    if (data?.metadata) {
      settings.value = parseSettings(data.metadata as Record<string, unknown>)
    }
  }

  async function connect() {
    const headers = await authHeader()
    const res = await fetch('/api/google/calendar/connect', { headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error((body as { error?: string }).error ?? 'Failed to start Google OAuth')
    }
    const url = (body as { url?: string }).url
    if (!url) throw new Error('Missing OAuth URL')
    window.location.href = url
  }

  async function disconnect() {
    const headers = await authHeader()
    const res = await fetch('/api/google/calendar/disconnect', { method: 'POST', headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error((body as { error?: string }).error ?? 'Disconnect failed')
    }
    connected.value = false
    googleEvents.value = []
    dashboard.value = null
    settings.value = {
      sync_tasks: true,
      sync_exams: true,
      sync_focus_sessions: false,
      travel_buffer_mins: 0,
      calendar_id: 'primary',
      export_calendar_id: 'primary',
      import_calendar_ids: ['primary'],
      email: null,
      token_expires_at: null,
    }
  }

  async function updateSettings(patch: Partial<GoogleCalendarSettings>) {
    const headers = await authHeader()
    const res = await fetch('/api/google/calendar/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify(patch),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error((body as { error?: string }).error ?? 'Settings update failed')
    }
    settings.value = {
      ...settings.value,
      ...(body as { settings?: GoogleCalendarSettings }).settings,
    }
  }

  async function fetchDashboard() {
    dashboardLoading.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/google/calendar/dashboard', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? 'Dashboard failed')
      }
      dashboard.value = body as CalendarDashboard
      connected.value = dashboard.value.connected
      if (dashboard.value.connected) {
        settings.value = {
          calendar_id: dashboard.value.calendar_id,
          sync_tasks: dashboard.value.sync_tasks,
          sync_exams: dashboard.value.sync_exams,
          email: dashboard.value.email,
          token_expires_at: settings.value.token_expires_at,
        }
      }
      return dashboard.value
    } finally {
      dashboardLoading.value = false
    }
  }

  async function syncNow() {
    syncing.value = true
    try {
      const result = await requestFullCalendarSync()
      await fetchDashboard().catch(() => {})
      return result
    } finally {
      syncing.value = false
    }
  }

  async function loadGoogleEvents(timeMin: string, timeMax: string) {
    if (!connected.value) {
      googleEvents.value = []
      return []
    }
    loading.value = true
    try {
      googleEvents.value = await fetchBusyBlocks(timeMin, timeMax)
      return googleEvents.value
    } catch {
      googleEvents.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  /** @deprecated use loadGoogleEvents */
  async function loadBusyBlocks(timeMin: string, timeMax: string) {
    return loadGoogleEvents(timeMin, timeMax)
  }

  return {
    connected,
    settings,
    email,
    googleEvents,
    /** @deprecated use googleEvents */
    busyBlocks: googleEvents,
    dashboard,
    loading,
    dashboardLoading,
    syncing,
    loadStatus,
    connect,
    disconnect,
    updateSettings,
    syncNow,
    fetchDashboard,
    loadGoogleEvents,
    loadBusyBlocks,
  }
})
