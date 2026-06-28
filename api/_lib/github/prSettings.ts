import type { IntegrationRecord } from '../integrations'
import type { GitHubIssueSyncStats } from './issueSettings'
import { normalizeRepoList } from './shared'

export interface GitHubPRSyncSettings {
  enabled: boolean
  repos: string[]
  review_requested_only: boolean
  sync_merged_as_done: boolean
}

export function defaultPRSyncSettings(): GitHubPRSyncSettings {
  return {
    enabled: false,
    repos: [],
    review_requested_only: true,
    sync_merged_as_done: true,
  }
}

export function parsePRSyncSettings(metadata: Record<string, unknown>): GitHubPRSyncSettings {
  const raw = metadata.pr_sync
  if (!raw || typeof raw !== 'object') return defaultPRSyncSettings()

  const prSync = raw as Record<string, unknown>
  const defaults = defaultPRSyncSettings()

  return {
    enabled: prSync.enabled === true,
    repos: normalizeRepoList(prSync.repos),
    review_requested_only: prSync.review_requested_only !== false,
    sync_merged_as_done: prSync.sync_merged_as_done !== false,
  }
}

export function mergePRSyncMetadata(
  integration: IntegrationRecord,
  patch: Partial<GitHubPRSyncSettings> & {
    last_sync_at?: string | null
    last_sync_stats?: GitHubIssueSyncStats | null
  }
): Record<string, unknown> {
  const current = parsePRSyncSettings(integration.metadata ?? {})
  const merged = {
    ...current,
    ...patch,
    repos: patch.repos !== undefined ? normalizeRepoList(patch.repos) : current.repos,
  }

  if (patch.last_sync_at !== undefined) {
    (merged as Record<string, unknown>).last_sync_at = patch.last_sync_at
  }
  if (patch.last_sync_stats !== undefined) {
    (merged as Record<string, unknown>).last_sync_stats = patch.last_sync_stats
  }

  return {
    ...(integration.metadata ?? {}),
    pr_sync: merged,
  }
}

export function readPRLastSync(metadata: Record<string, unknown>) {
  const raw = metadata.pr_sync
  if (!raw || typeof raw !== 'object') {
    return { last_sync_at: null as string | null, last_sync_stats: null as GitHubIssueSyncStats | null }
  }
  const prSync = raw as Record<string, unknown>
  return {
    last_sync_at: typeof prSync.last_sync_at === 'string' ? prSync.last_sync_at : null,
    last_sync_stats:
      prSync.last_sync_stats && typeof prSync.last_sync_stats === 'object'
        ? (prSync.last_sync_stats as GitHubIssueSyncStats)
        : null,
  }
}
