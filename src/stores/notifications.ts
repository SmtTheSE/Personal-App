import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'

export interface NotificationEvent {
  id: string
  event_type: string
  title: string
  body: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

export const useNotificationsStore = defineStore('notifications', () => {
  const events = ref<NotificationEvent[]>([])
  const loading = ref(false)

  const unreadCount = computed(() => events.value.filter((e) => !e.read_at).length)

  async function fetchEvents() {
    loading.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/notifications/events', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to load notifications')
      events.value = body.events ?? []
    } finally {
      loading.value = false
    }
  }

  async function markRead(id: string) {
    const headers = await authHeader()
    await fetch('/api/notifications/events', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    const row = events.value.find((e) => e.id === id)
    if (row) row.read_at = new Date().toISOString()
  }

  async function markAllRead() {
    const headers = await authHeader()
    await fetch('/api/notifications/events', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all: true }),
    })
    events.value.forEach((e) => { e.read_at = new Date().toISOString() })
  }

  async function runChecks() {
    const headers = await authHeader()
    await fetch('/api/notifications/check', { method: 'POST', headers })
    await fetchEvents()
  }

  async function subscribePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    const headers = await authHeader()
    const keyRes = await fetch('/api/notifications/subscribe', { headers })
    const keyBody = await keyRes.json().catch(() => ({}))
    const vapidKey = keyBody.vapid_public_key as string | null
    if (!vapidKey) return false

    const registration = await navigator.serviceWorker.ready
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    })

    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))) },
      }),
    })
    return true
  }

  return {
    events,
    loading,
    unreadCount,
    fetchEvents,
    markRead,
    markAllRead,
    runChecks,
    subscribePush,
  }
})
