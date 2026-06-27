import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { GitHubIssueSyncSettings, GitHubIssueSyncStats, GitHubIssueSyncStatus } from '@/types/githubIssues'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

export const useGitHubIssuesStore = defineStore('githubIssues', () => {
  const githubConnected = ref(false)
  const settings = ref<GitHubIssueSyncSettings>({
    enabled: false,
    repos: [],
    sync_closed_as_done: true,
    label_priority: {},
  })
  const lastSyncAt = ref<string | null>(null)
  const lastSyncStats = ref<GitHubIssueSyncStats | null>(null)
  const loading = ref(false)
  const syncing = ref(false)
  const saving = ref(false)

  async function fetchStatus() {
    loading.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/github/issues/status', { headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to load GitHub issue sync')
      const data = body as GitHubIssueSyncStatus
      githubConnected.value = data.github_connected
      settings.value = data.settings
      lastSyncAt.value = data.last_sync_at
      lastSyncStats.value = data.last_sync_stats
      return data
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(patch: Partial<GitHubIssueSyncSettings>) {
    saving.value = true
    try {
      const headers = await authHeader()
      const res = await fetch('/api/github/issues/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify(patch),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to save settings')
      settings.value = (body as { settings: GitHubIssueSyncSettings }).settings
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
      const res = await fetch('/api/github/issues/sync', { method: 'POST', headers })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Sync failed')
      const stats = body as GitHubIssueSyncStats
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
