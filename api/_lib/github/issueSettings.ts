import type { IntegrationRecord } from '../integrations'

export type TaskPriority = 'low' | 'medium' | 'high'

export interface GitHubIssueSyncSettings {
  enabled: boolean
  repos: string[]
  sync_closed_as_done: boolean
  label_priority: Record<string, TaskPriority>
}

export interface GitHubIssueSyncStats {
  created: number
  updated: number
  closed: number
  unchanged: number
  errors: string[]
}

export const DEFAULT_LABEL_PRIORITY: Record<string, TaskPriority> = {
  'priority: critical': 'high',
  critical: 'high',
  urgent: 'high',
  p0: 'high',
  'priority: high': 'high',
  high: 'high',
  bug: 'high',
  security: 'high',
  'priority: low': 'low',
  low: 'low',
  enhancement: 'low',
  documentation: 'low',
  chore: 'low',
}

export function defaultIssueSyncSettings(): GitHubIssueSyncSettings {
  return {
    enabled: false,
    repos: [],
    sync_closed_as_done: true,
    label_priority: { ...DEFAULT_LABEL_PRIORITY },
  }
}

function normalizeRepoList(repos: unknown): string[] {
  if (!Array.isArray(repos)) return []
  return [...new Set(repos.filter((r): r is string => typeof r === 'string' && r.includes('/')))]
}

function normalizeLabelPriority(value: unknown): Record<string, TaskPriority> {
  if (!value || typeof value !== 'object') return { ...DEFAULT_LABEL_PRIORITY }
  const out: Record<string, TaskPriority> = { ...DEFAULT_LABEL_PRIORITY }
  for (const [key, priority] of Object.entries(value as Record<string, unknown>)) {
    if (priority === 'low' || priority === 'medium' || priority === 'high') {
      out[key.toLowerCase()] = priority
    }
  }
  return out
}

export function parseIssueSyncSettings(metadata: Record<string, unknown>): GitHubIssueSyncSettings {
  const raw = metadata.issue_sync
  if (!raw || typeof raw !== 'object') return defaultIssueSyncSettings()

  const issueSync = raw as Record<string, unknown>
  const defaults = defaultIssueSyncSettings()

  return {
    enabled: issueSync.enabled === true,
    repos: normalizeRepoList(issueSync.repos),
    sync_closed_as_done: issueSync.sync_closed_as_done !== false,
    label_priority: normalizeLabelPriority(issueSync.label_priority),
  }
}

export function mergeIssueSyncMetadata(
  integration: IntegrationRecord,
  patch: Partial<GitHubIssueSyncSettings> & {
    last_sync_at?: string | null
    last_sync_stats?: GitHubIssueSyncStats | null
  }
): Record<string, unknown> {
  const current = parseIssueSyncSettings(integration.metadata ?? {})
  const merged: GitHubIssueSyncSettings & {
    last_sync_at?: string | null
    last_sync_stats?: GitHubIssueSyncStats | null
  } = {
    ...current,
    ...patch,
    repos: patch.repos !== undefined ? normalizeRepoList(patch.repos) : current.repos,
    label_priority:
      patch.label_priority !== undefined
        ? normalizeLabelPriority(patch.label_priority)
        : current.label_priority,
  }

  if (patch.last_sync_at !== undefined) merged.last_sync_at = patch.last_sync_at
  if (patch.last_sync_stats !== undefined) merged.last_sync_stats = patch.last_sync_stats

  return {
    ...(integration.metadata ?? {}),
    issue_sync: merged,
  }
}

export function readLastSync(metadata: Record<string, unknown>) {
  const raw = metadata.issue_sync
  if (!raw || typeof raw !== 'object') {
    return { last_sync_at: null as string | null, last_sync_stats: null as GitHubIssueSyncStats | null }
  }
  const issueSync = raw as Record<string, unknown>
  return {
    last_sync_at: typeof issueSync.last_sync_at === 'string' ? issueSync.last_sync_at : null,
    last_sync_stats:
      issueSync.last_sync_stats && typeof issueSync.last_sync_stats === 'object'
        ? (issueSync.last_sync_stats as GitHubIssueSyncStats)
        : null,
  }
}
