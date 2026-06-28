import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'

interface CaptureTokenRow {
  id: string
  label: string
  token_prefix: string
  last_used_at: string | null
  created_at: string
}

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

export const useCaptureStore = defineStore('capture', () => {
  const tokens = ref<CaptureTokenRow[]>([])
  const lastCreatedToken = ref<string | null>(null)
  const loading = ref(false)

  async function fetchTokens() {
    loading.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/capture/token', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to load tokens')
      tokens.value = body.tokens ?? []
    } finally {
      loading.value = false
    }
  }

  async function createToken(label = 'Shortcuts') {
    const headers = await authHeader()
    const res = await fetch('/api/capture/token', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error ?? 'Create failed')
    lastCreatedToken.value = body.token as string
    await fetchTokens()
    return body as { token: string; hint: string }
  }

  async function revokeToken(id: string) {
    const headers = await authHeader()
    const res = await fetch(`/api/capture/token?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers,
    })
    if (!res.ok) throw new Error('Revoke failed')
    tokens.value = tokens.value.filter((t) => t.id !== id)
  }

  return { tokens, lastCreatedToken, loading, fetchTokens, createToken, revokeToken }
})
