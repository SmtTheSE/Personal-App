export type TaskSource =
  | 'manual'
  | 'github_issue'
  | 'github_pr'
  | 'telegram'
  | 'vercel_deploy'
  | 'gmail'
  | 'shortcut'

export interface TaskExternalRef {
  provider: TaskSource
  repo?: string
  number?: number
  id?: string | number
  url?: string
  deployment_uid?: string
  vercel_project_id?: string
}

import type { Task } from '@/types'

export function taskExternalRef(task: Task): TaskExternalRef | null {
  if (!task.external_ref || typeof task.external_ref !== 'object') return null
  return task.external_ref as unknown as TaskExternalRef
}

export function isGitHubIssueTask(task: Task): boolean {
  if (task.source === 'github_issue') return true
  return task.description?.includes('GitHub:') === true && !task.description?.includes('GitHub PR:')
}

export function isGitHubPRTask(task: Task): boolean {
  if (task.source === 'github_pr') return true
  return task.description?.includes('GitHub PR:') ?? false
}

export function isGitHubSyncedTask(task: Task): boolean {
  return isGitHubIssueTask(task) || isGitHubPRTask(task)
}

export function isVercelDeployTask(task: Task): boolean {
  return task.source === 'vercel_deploy'
}
