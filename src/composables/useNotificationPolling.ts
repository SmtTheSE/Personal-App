import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'
import { useGmailStore } from '@/stores/gmail'
import { playAlertSound, showBrowserAlert, ensureNotificationPermission } from '@/lib/alertSound'

const POLL_MS = 60 * 1000

export function useNotificationPolling() {
  const auth = useAuthStore()
  const notifications = useNotificationsStore()
  const gmail = useGmailStore()
  let timer: ReturnType<typeof setInterval> | null = null
  let knownAlertIds = new Set<string>()

  async function poll() {
    if (!auth.isAuthenticated) return

    try {
      if (!gmail.connected) {
        await gmail.loadStatus().catch(() => {})
      }
      if (gmail.connected && gmail.alertEnabled) {
        const headers = await (async () => {
          const { supabase } = await import('@/lib/supabase')
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.access_token) return null
          return { Authorization: `Bearer ${session.access_token}` }
        })()
        if (headers) {
          await fetch('/api/gmail/alerts', { method: 'POST', headers })
        }
      }

      const prevIds = new Set(notifications.events.map((e) => e.id))
      await notifications.fetchEvents()

      for (const event of notifications.events) {
        if (event.event_type !== 'gmail_alert' || event.read_at) continue
        if (knownAlertIds.has(event.id) || prevIds.has(event.id)) continue

        knownAlertIds.add(event.id)
        playAlertSound()
        showBrowserAlert(event.title, event.body.split('\n')[0] ?? event.body)
      }
    } catch {
      // background polling — ignore transient errors
    }
  }

  function start() {
    stop()
    if (!auth.isAuthenticated) return
    void ensureNotificationPermission()
    void poll()
    timer = setInterval(poll, POLL_MS)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  onMounted(() => {
    if (auth.initialized && auth.isAuthenticated) start()
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
  })

  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && auth.isAuthenticated) {
      void poll()
    }
  }

  watch(
    () => auth.isAuthenticated,
    (loggedIn) => {
      if (loggedIn) start()
      else stop()
    }
  )

  onUnmounted(() => {
    stop()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  return { poll }
}
