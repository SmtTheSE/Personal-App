import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { fetchBusyBlocks, requestFullCalendarSync } from '@/lib/calendar/syncClient'
import type { CalendarBusyBlock, GoogleCalendarSettings } from '@/types/calendar'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

function parseSettings(metadata: Record<string, unknown>): GoogleCalendarSettings {
  return {
    calendar_id: typeof metadata.calendar_id === 'string' ? metadata.calendar_id : 'primary',
    sync_tasks: metadata.sync_tasks !== false,
    sync_exams: metadata.sync_exams !== false,
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
    calendar_id: 'primary',
    email: null,
    token_expires_at: null,
  })
  const busyBlocks = ref<CalendarBusyBlock[]>([])
  const loading = ref(false)
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
    busyBlocks.value = []
    settings.value = {
      sync_tasks: true,
      sync_exams: true,
      calendar_id: 'primary',
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

  async function syncNow() {
    syncing.value = true
    try {
      return await requestFullCalendarSync()
    } finally {
      syncing.value = false
    }
  }

  async function loadBusyBlocks(timeMin: string, timeMax: string) {
    if (!connected.value) {
      busyBlocks.value = []
      return []
    }
    loading.value = true
    try {
      busyBlocks.value = await fetchBusyBlocks(timeMin, timeMax)
      return busyBlocks.value
    } catch {
      busyBlocks.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  return {
    connected,
    settings,
    email,
    busyBlocks,
    loading,
    syncing,
    loadStatus,
    connect,
    disconnect,
    updateSettings,
    syncNow,
    loadBusyBlocks,
  }
})
