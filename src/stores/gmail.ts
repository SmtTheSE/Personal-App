import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export interface GmailSyncStats {
  imported: number
  skipped: number
  errors: string[]
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

export const useGmailStore = defineStore('gmail', () => {
  const connected = ref(false)
  const email = ref<string | null>(null)
  const labelName = ref('nexus/task')
  const connectedAt = ref<string | null>(null)
  const lastSyncAt = ref<string | null>(null)
  const lastSync = ref<GmailSyncStats | null>(null)
  const alertEnabled = ref(true)
  const alertKeywords = ref<string[]>(['Saigon Business School'])
  const lastAlertCheckAt = ref<string | null>(null)
  const lastAlertStats = ref<{ notified: number; checked: number } | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const loadError = ref<string | null>(null)

  const statusLabel = computed(() => {
    if (loading.value) return 'Checking…'
    if (loadError.value) return loadError.value
    if (!connected.value) return 'Not connected'
    return email.value ? `Connected — ${email.value}` : 'Connected'
  })

  async function loadStatus() {
    loading.value = true
    loadError.value = null
    try {
      const headers = await authHeader()
      const res = await fetch('/api/gmail/settings', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to load Gmail status')
      connected.value = body.connected === true
      email.value = body.email ?? null
      labelName.value = body.label_name ?? 'nexus/task'
      connectedAt.value = body.connected_at ?? null
      lastSyncAt.value = body.last_sync_at ?? null
      lastSync.value = body.last_sync ?? null
      alertEnabled.value = body.alert_enabled !== false
      alertKeywords.value = Array.isArray(body.alert_keywords) && body.alert_keywords.length
        ? body.alert_keywords
        : ['Saigon Business School']
      lastAlertCheckAt.value = body.last_alert_check_at ?? null
      lastAlertStats.value = body.last_alert_stats ?? null
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : 'Failed to load Gmail status'
      connected.value = false
      throw err
    } finally {
      loading.value = false
    }
  }

  async function connect() {
    const headers = await authHeader()
    const res = await fetch('/api/gmail/connect', { headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Connect failed')
    window.location.href = body.url
  }

  async function disconnect() {
    const headers = await authHeader()
    const res = await fetch('/api/gmail/settings', { method: 'DELETE', headers })
    if (!res.ok) throw new Error('Disconnect failed')
    connected.value = false
    email.value = null
    connectedAt.value = null
    lastSyncAt.value = null
    lastSync.value = null
  }

  async function sync() {
    syncing.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/gmail/sync', { method: 'POST', headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Sync failed')
      const stats = body as GmailSyncStats
      lastSync.value = stats
      lastSyncAt.value = new Date().toISOString()
      await loadStatus()
      return stats
    } finally {
      syncing.value = false
    }
  }

  async function updateSettings(input: {
    label_name?: string
    alert_enabled?: boolean
    alert_keywords?: string[]
  }) {
    const headers = await authHeader()
    const res = await fetch('/api/gmail/settings', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Settings update failed')
    if (input.label_name) labelName.value = input.label_name
    if (typeof input.alert_enabled === 'boolean') alertEnabled.value = input.alert_enabled
    if (input.alert_keywords) alertKeywords.value = input.alert_keywords
  }

  async function updateLabel(name: string) {
    await updateSettings({ label_name: name })
  }

  async function checkAlerts() {
    const headers = await authHeader()
    const res = await fetch('/api/gmail/alerts', { method: 'POST', headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Alert check failed')
    await loadStatus()
    return body as { notified: number; checked: number }
  }

  return {
    connected,
    email,
    labelName,
    connectedAt,
    lastSyncAt,
    lastSync,
    alertEnabled,
    alertKeywords,
    lastAlertCheckAt,
    lastAlertStats,
    loading,
    syncing,
    loadError,
    statusLabel,
    loadStatus,
    connect,
    disconnect,
    sync,
    updateLabel,
    updateSettings,
    checkAlerts,
  }
})
