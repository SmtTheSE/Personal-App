import type { Task } from '@/types'

export type KanbanColumn = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'

export interface KanbanColumnDef {
  id: KanbanColumn
  title: string
  subtitle: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  { id: 'backlog', title: 'Backlog', subtitle: 'Ideas & unprioritized' },
  { id: 'todo', title: 'Ready', subtitle: 'Sprint-ready work' },
  { id: 'in_progress', title: 'In Progress', subtitle: 'Active development' },
  { id: 'review', title: 'Review', subtitle: 'PR / QA / code review' },
  { id: 'done', title: 'Done', subtitle: 'Shipped' },
]

export interface KanbanBoardModel {
  columns: Record<KanbanColumn, Task[]>
}
