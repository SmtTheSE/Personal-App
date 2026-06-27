import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import type {
  DeploymentDashboard,
  GitHubRepo,
  GitHubReposPage,
  IntegrationProvider,
  IntegrationStatus,
} from '@/types/integrations'

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return { Authorization: `Bearer ${session.access_token}` }
}

async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeader()
  const res = await fetch(path, { headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.error ?? `Request failed (${res.status})`)
  }
  return body as T
}

export const useIntegrationsStore = defineStore('integrations', () => {
  const statuses = ref<IntegrationStatus[]>([])
  const dashboard = ref<DeploymentDashboard | null>(null)
  const githubRepos = ref<GitHubRepo[]>([])
  const githubReposPage = ref(1)
  const githubReposPerPage = ref(30)
  const githubReposHasMore = ref(false)
  const loading = ref(false)
  const dashboardLoading = ref(false)

  const githubConnected = computed(
    () => statuses.value.find((s) => s.provider === 'github')?.connected ?? false
  )
  const vercelConnected = computed(
    () => statuses.value.find((s) => s.provider === 'vercel')?.connected ?? false
  )
  const googleCalendarConnected = computed(
    () => statuses.value.find((s) => s.provider === 'google_calendar')?.connected ?? false
  )

  async function fetchStatuses() {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('provider, updated_at, metadata')

    if (error) throw error

    const providers: IntegrationProvider[] = ['github', 'vercel', 'google_calendar', 'telegram']
    statuses.value = providers.map((provider) => {
      const row = data?.find((d) => d.provider === provider)
      return {
        provider,
        connected: !!row,
        updated_at: row?.updated_at ?? null,
        metadata: (row?.metadata as Record<string, unknown>) ?? {},
      }
    })
  }

  async function syncGithubFromSession() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user || !session.provider_token) return false

    const isGithub =
      session.user.app_metadata?.provider === 'github' ||
      session.user.identities?.some((i) => i.provider === 'github')
    if (!isGithub) return false

    const { error } = await supabase.from('user_integrations').upsert(
      {
        user_id: session.user.id,
        provider: 'github',
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

    if (error) throw error
    await fetchStatuses()
    return true
  }

  async function saveVercelToken(token: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const trimmed = token.trim()
    if (!trimmed) throw new Error('Token is required')

    const { error } = await supabase.from('user_integrations').upsert(
      {
        user_id: user.id,
        provider: 'vercel',
        access_token: trimmed,
        refresh_token: null,
        metadata: { label: 'Vercel API token' },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' }
    )

    if (error) throw error
    await fetchStatuses()
  }

  async function disconnect(provider: IntegrationProvider) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('user_id', user.id)
      .eq('provider', provider)

    if (error) throw error
    await fetchStatuses()
    if (provider === 'vercel') dashboard.value = null
  }

  async function fetchGitHubRepos(page = 1) {
    loading.value = true
    try {
      const data = await apiGet<GitHubReposPage>(
        `/api/github/repos?page=${page}&per_page=${githubReposPerPage.value}`
      )
      githubRepos.value = data.repos
      githubReposPage.value = data.page
      githubReposPerPage.value = data.per_page
      githubReposHasMore.value = data.has_more
      return data.repos
    } finally {
      loading.value = false
    }
  }

  async function nextGitHubReposPage() {
    if (!githubReposHasMore.value) return githubRepos.value
    return fetchGitHubRepos(githubReposPage.value + 1)
  }

  async function prevGitHubReposPage() {
    if (githubReposPage.value <= 1) return githubRepos.value
    return fetchGitHubRepos(githubReposPage.value - 1)
  }

  async function fetchDashboard() {
    dashboardLoading.value = true
    try {
      dashboard.value = await apiGet<DeploymentDashboard>('/api/vercel/dashboard')
      if (dashboard.value.repos.length) {
        githubRepos.value = dashboard.value.repos
      }
      return dashboard.value
    } finally {
      dashboardLoading.value = false
    }
  }

  return {
    statuses,
    dashboard,
    githubRepos,
    githubReposPage,
    githubReposPerPage,
    githubReposHasMore,
    loading,
    dashboardLoading,
    githubConnected,
    vercelConnected,
    googleCalendarConnected,
    fetchStatuses,
    syncGithubFromSession,
    saveVercelToken,
    disconnect,
    fetchGitHubRepos,
    nextGitHubReposPage,
    prevGitHubReposPage,
    fetchDashboard,
  }
})
