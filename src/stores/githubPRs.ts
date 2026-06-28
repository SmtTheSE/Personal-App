import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { GitHubPRSyncSettings, GitHubPRSyncStats, GitHubPRSyncStatus } from '@/types/githubPRs'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export const useGitHubPRsStore = defineStore('githubPRs', () => {
  const githubConnected = ref(false)
  const settings = ref<GitHubPRSyncSettings>({
    enabled: false,
    repos: [],
    review_requested_only: true,
    sync_merged_as_done: true,
  })
  const lastSyncAt = ref<string | null>(null)
  const lastSyncStats = ref<GitHubPRSyncStats | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const saving = ref(false)

  async function fetchStatus() {
    loading.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/github/prs/status', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to load GitHub PR sync')
      const data = body as GitHubPRSyncStatus
      githubConnected.value = data.github_connected
      settings.value = data.settings
      lastSyncAt.value = data.last_sync_at
      lastSyncStats.value = data.last_sync_stats
      return data
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(patch: Partial<GitHubPRSyncSettings>) {
    saving.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/github/prs/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(patch),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to save settings')
      settings.value = (body as { settings: GitHubPRSyncSettings }).settings
    } finally {
      saving.value = false
    }
  }

  async function toggleRepo(repoFullName: string, enabled: boolean) {
    const repos = new Set(settings.value.repos)
    if (enabled) repos.add(repoFullName)
    else repos.delete(repoFullName)
    await saveSettings({ repos: [...repos], enabled: enabled || repos.size > 0 })
  }

  async function syncNow() {
    syncing.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/github/prs/sync', { method: 'POST', headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Sync failed')
      const stats = body as GitHubPRSyncStats
      lastSyncAt.value = new Date().toISOString()
      lastSyncStats.value = stats
      return stats
    } finally {
      syncing.value = false
    }
  }

  return {
    githubConnected,
    settings,
    lastSyncAt,
    lastSyncStats,
    loading,
    syncing,
    saving,
    fetchStatus,
    saveSettings,
    toggleRepo,
    syncNow,
  }
})
