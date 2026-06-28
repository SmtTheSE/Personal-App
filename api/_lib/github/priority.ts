import { DEFAULT_LABEL_PRIORITY, type TaskPriority } from './issueSettings.js'

export function priorityFromLabels(
  labels: { name: string }[],
  labelPriority: Record<string, TaskPriority>
): TaskPriority {
  const map = { ...DEFAULT_LABEL_PRIORITY, ...labelPriority }
  let best: TaskPriority = 'medium'
  let bestScore = 1

  const score: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 }

  for (const label of labels) {
    const key = label.name.toLowerCase()
    const priority = map[key]
    if (!priority) continue
    if (score[priority] > bestScore) {
      best = priority
      bestScore = score[priority]
    }
  }

  return best
}
