import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { supabase } from '@/lib/supabase'

interface TelegramConnectResponse {
  bot_username: string
  link_code: string
  link_url: string
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

export const useTelegramStore = defineStore('telegram', () => {
  const linkUrl = ref<string | null>(null)
  const botUsername = ref<string | null>(null)
  const connecting = ref(false)

  const connected = computed(() => {
    const row = integrationRow.value
    return !!row && row.metadata?.linked !== false && row.access_token !== 'pending'
  })

  const integrationRow = ref<{
    access_token: string
    metadata: Record<string, unknown>
    updated_at: string
  } | null>(null)

  const displayName = computed(() => {
    const meta = integrationRow.value?.metadata
    if (!meta) return null
    const username = meta.username as string | undefined
    const first = meta.first_name as string | undefined
    if (username) return `@${username}`
    return first ?? 'Telegram chat'
  })

  async function fetchStatus() {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('access_token, metadata, updated_at')
      .eq('provider', 'telegram')
      .maybeSingle()

    if (error) throw error
    integrationRow.value = data
      ? {
          access_token: data.access_token,
          metadata: (data.metadata as Record<string, unknown>) ?? {},
          updated_at: data.updated_at,
        }
      : null

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (
      data?.access_token &&
      data.access_token !== 'pending' &&
      data.metadata?.linked !== false &&
      timezone &&
      (data.metadata as Record<string, unknown> | null)?.timezone !== timezone
    ) {
      void updateNotifications({ timezone })
    }
  }

  async function connect() {
    connecting.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/telegram/connect', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Connect failed')
      const data = body as TelegramConnectResponse
      linkUrl.value = data.link_url
      botUsername.value = data.bot_username
      await fetchStatus()
      window.open(data.link_url, '_blank', 'noopener,noreferrer')
      return data
    } finally {
      connecting.value = false
    }
  }

  async function disconnect() {
    const headers = await authHeader()
    const res = await fetch('/api/telegram/disconnect', { method: 'POST', headers })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Disconnect failed')
    linkUrl.value = null
    integrationRow.value = null
  }

  const notifications = computed(() => {
    const meta = integrationRow.value?.metadata ?? {}
    const raw = meta.notifications
    if (!raw || typeof raw !== 'object') {
      return { digest_enabled: false, digest_hour_utc: 8, alert_deploy_fail: true }
    }
    const n = raw as Record<string, unknown>
    return {
      digest_enabled: n.digest_enabled === true,
      digest_hour_utc: typeof n.digest_hour_utc === 'number' ? n.digest_hour_utc : 8,
      alert_deploy_fail: n.alert_deploy_fail !== false,
    }
  })

  async function updateNotifications(patch: {
    digest_enabled?: boolean
    digest_hour_utc?: number
    alert_deploy_fail?: boolean
    timezone?: string
  }) {
    const headers = await authHeader()
    const res = await fetch('/api/telegram/settings', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Settings update failed')
    await fetchStatus()
  }

  return {
    linkUrl,
    botUsername,
    connecting,
    connected,
    displayName,
    notifications,
    fetchStatus,
    connect,
    disconnect,
    updateNotifications,
  }
})
