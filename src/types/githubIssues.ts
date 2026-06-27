import type { TaskPriority } from '@/types'

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

export interface GitHubIssueSyncStatus {
  github_connected: boolean
  settings: GitHubIssueSyncSettings
  last_sync_at: string | null
  last_sync_stats: GitHubIssueSyncStats | null
}
