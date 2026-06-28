export interface GitHubPRSyncSettings {
  enabled: boolean
  repos: string[]
  review_requested_only: boolean
  sync_merged_as_done: boolean
}

export type GitHubPRSyncStats = {
  created: number
  updated: number
  closed: number
  unchanged: number
  errors: string[]
}

export interface GitHubPRSyncStatus {
  github_connected: boolean
  settings: GitHubPRSyncSettings
  last_sync_at: string | null
  last_sync_stats: GitHubPRSyncStats | null
}
