import type { KanbanColumn } from '@/types/kanban'
import type { TaskStatus } from '@/types'

export {
  isGitHubSyncedTask,
  isGitHubIssueTask,
  isGitHubPRTask,
  isVercelDeployTask,
} from '@/lib/tasks/source'

export function statusForKanbanColumn(column: KanbanColumn): TaskStatus {
  if (column === 'done') return 'done'
  if (column === 'in_progress' || column === 'review') return 'in_progress'
  return 'todo'
}

export function kanbanColumnForStatus(status: TaskStatus, kanbanColumn?: KanbanColumn | null): KanbanColumn {
  if (kanbanColumn) return kanbanColumn
  if (status === 'done') return 'done'
  if (status === 'in_progress') return 'in_progress'
  return 'todo'
}
