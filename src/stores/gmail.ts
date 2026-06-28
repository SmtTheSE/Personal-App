import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

export const useGmailStore = defineStore('gmail', () => {
  const connected = ref(false)
  const labelName = ref('nexus/task')
  const loading = ref(false)
  const syncing = ref(false)

  async function loadStatus() {
    loading.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/gmail/settings', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to load Gmail status')
      connected.value = body.connected === true
      labelName.value = body.label_name ?? 'nexus/task'
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
  }

  async function sync() {
    syncing.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/gmail/sync', { method: 'POST', headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Sync failed')
      return body as { imported: number; skipped: number; errors: string[] }
    } finally {
      syncing.value = false
    }
  }

  async function updateLabel(name: string) {
    const headers = await authHeader()
    const res = await fetch('/api/gmail/settings', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label_name: name }),
    })
    if (!res.ok) throw new Error('Settings update failed')
    labelName.value = name
  }

  return { connected, labelName, loading, syncing, loadStatus, connect, disconnect, sync, updateLabel }
})
