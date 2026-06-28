import type { TaskExternalRef, TaskSource } from './source'

export interface SyncedTaskRow {
  id: string
  status: string
  kanban_column?: string | null
  source?: string | null
}

export interface CreateSyncedTaskInput {
  user_id: string
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'done'
  kanban_column?: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
  due_date: string | null
  project_id: string | null
  sort_order: number
  source: TaskSource
  external_ref: TaskExternalRef
}

export interface UpdateSyncedTaskPatch {
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  project_id: string | null
}

/** Preserve workflow state when external content changes but user moved the card. */
export function mergeSyncedTaskUpdate(
  existing: SyncedTaskRow,
  patch: UpdateSyncedTaskPatch
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...patch }

  if (existing.status === 'done') {
    return payload
  }

  // Do not reset kanban_column or status for synced tasks the user advanced
  if (existing.kanban_column && existing.kanban_column !== 'todo') {
    delete payload.status
  }

  return payload
}

export function buildDescription(body: string | null | undefined, footer: string): string | null {
  const parts: string[] = []
  if (body?.trim()) parts.push(body.trim())
  parts.push(footer)
  return parts.join('\n')
}
