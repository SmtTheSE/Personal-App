import {
  addMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
} from 'date-fns'
import type { CalendarEvent } from '@/composables/useCalendarWeek'
import type { Task } from '@/types'
import type { DayPlan, PlanBlockKind, PlanTimeBlock, WeeklyPlanSummary } from '@/types/planner'
import { isGitHubSyncedTask, isGitHubPRTask, isVercelDeployTask } from '@/lib/tasks/source'

const FOCUS_BLOCK_MINS = 25
const DAY_START_HOUR = 8
const DAY_END_HOUR = 21

interface BusyInterval {
  start: Date
  end: Date
}

function clampDayWindow(day: Date) {
  return {
    start: setMinutes(setHours(startOfDay(day), DAY_START_HOUR), 0),
    end: setMinutes(setHours(startOfDay(day), DAY_END_HOUR), 0),
  }
}

function eventToInterval(event: CalendarEvent, travelBufferMins: number): BusyInterval | null {
  if (event.type === 'task') return null
  const start = event.allDay
    ? setMinutes(setHours(startOfDay(event.date), DAY_START_HOUR), 0)
    : event.date
  const end = event.allDay
    ? setMinutes(setHours(startOfDay(event.date), DAY_END_HOUR), 0)
    : (event.endDate ?? addMinutes(event.date, 60))

  if (travelBufferMins > 0 && !event.allDay) {
    return {
      start: addMinutes(start, -travelBufferMins),
      end: addMinutes(end, travelBufferMins),
    }
  }
  return { start, end }
}

function mergeBusy(intervals: BusyInterval[]): BusyInterval[] {
  if (!intervals.length) return []
  const sorted = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime())
  const merged: BusyInterval[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1]
    const current = sorted[i]
    if (current.start <= last.end) {
      last.end = current.end > last.end ? current.end : last.end
    } else {
      merged.push({ ...current })
    }
  }
  return merged
}

function freeSlots(day: Date, busy: BusyInterval[]): { start: Date; end: Date }[] {
  const window = clampDayWindow(day)
  const merged = mergeBusy(
    busy
      .map((b) => ({
        start: b.start < window.start ? window.start : b.start,
        end: b.end > window.end ? window.end : b.end,
      }))
      .filter((b) => b.end > b.start)
  )

  const slots: { start: Date; end: Date }[] = []
  let cursor = window.start

  for (const block of merged) {
    if (block.start > cursor) slots.push({ start: cursor, end: block.start })
    if (block.end > cursor) cursor = block.end
  }
  if (cursor < window.end) slots.push({ start: cursor, end: window.end })
  return slots
}

function priorityScore(task: Task) {
  const map = { high: 3, medium: 2, low: 1 }
  let score = map[task.priority]
  if (isGitHubSyncedTask(task)) score += 0.5
  if (isGitHubPRTask(task)) score += 1.5
  if (isVercelDeployTask(task)) score += 2
  if (task.kanban_column === 'review') score += 1
  if (task.due_date) {
    const due = parseISO(task.due_date).getTime()
    const days = (due - Date.now()) / (1000 * 60 * 60 * 24)
    if (days <= 1) score += 2
    else if (days <= 3) score += 1
  }
  return score
}

function eventToPlanBlock(event: CalendarEvent, kind: PlanBlockKind): PlanTimeBlock {
  const sourceType =
    event.type === 'google'
      ? 'google'
      : event.type === 'exam'
        ? 'exam'
        : event.type === 'focus'
          ? 'focus'
          : event.type === 'review'
            ? 'review'
            : 'task'

  const start = event.allDay
    ? setMinutes(setHours(startOfDay(event.date), 9), 0)
    : event.date
  const end = event.allDay
    ? addMinutes(start, 30)
    : (event.endDate ?? addMinutes(event.date, 60))

  return {
    id: event.id,
    kind,
    title: event.title,
    subtitle: event.subtitle,
    start,
    end,
    sourceType,
    sourceId: event.id.split('-').slice(1).join('-'),
    path: event.path,
    externalUrl: event.externalUrl,
    suggested: false,
  }
}

function taskDeadlineBlock(task: Task, day: Date): PlanTimeBlock | null {
  if (!task.due_date || task.status === 'done') return null
  const due = startOfDay(parseISO(task.due_date))
  if (!isSameDay(due, day)) return null
  const start = setMinutes(setHours(due, 17), 0)
  return {
    id: `deadline-task-${task.id}`,
    kind: 'deadline',
    title: task.title,
    subtitle: `${task.priority} priority · due today`,
    start,
    end: addMinutes(start, 30),
    sourceType: isGitHubSyncedTask(task) ? 'github' : 'task',
    sourceId: task.id,
    path: '/tasks',
    suggested: false,
  }
}

function prReviewBlock(task: Task, day: Date): PlanTimeBlock | null {
  if (task.kanban_column !== 'review' || task.status === 'done') return null
  const start = setMinutes(setHours(startOfDay(day), 9), 0)
  return {
    id: `review-pr-${task.id}-${day.toISOString()}`,
    kind: 'fixed',
    title: task.title,
    subtitle: 'PR review · kanban',
    start,
    end: addMinutes(start, 45),
    sourceType: 'review',
    sourceId: task.id,
    path: '/kanban',
    suggested: false,
  }
}

export function buildWeeklyPlan(input: {
  weekStart: Date
  events: CalendarEvent[]
  tasks: Task[]
  studyGoalMinsPerDay: number
  travelBufferMins?: number
}): WeeklyPlanSummary {
  const travelBufferMins = input.travelBufferMins ?? 0
  const weekEnd = endOfWeek(input.weekStart, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: input.weekStart, end: weekEnd })
  const pendingTasks = input.tasks.filter((t) => t.status !== 'done')
  const rankedTasks = [...pendingTasks].sort((a, b) => priorityScore(b) - priorityScore(a))

  const githubTaskCount = pendingTasks.filter(isGitHubSyncedTask).length
  const prReviewCount = pendingTasks.filter((t) => t.kanban_column === 'review').length
  let taskCursor = 0

  const dayPlans: DayPlan[] = days.map((day) => {
    const dayEvents = input.events.filter((e) => isSameDay(e.date, day))
    const fixedBlocks: PlanTimeBlock[] = []

    for (const event of dayEvents) {
      if (event.type === 'task') continue
      fixedBlocks.push(eventToPlanBlock(event, 'fixed'))
    }

    for (const task of pendingTasks) {
      const deadline = taskDeadlineBlock(task, day)
      if (deadline) fixedBlocks.push(deadline)
      const review = prReviewBlock(task, day)
      if (review) fixedBlocks.push(review)
    }

    const busy = dayEvents
      .map((event) => eventToInterval(event, travelBufferMins))
      .filter((x): x is BusyInterval => x !== null)

    const slots = freeSlots(day, busy)
    const focusBlocks: PlanTimeBlock[] = []
    let scheduledStudy = 0
    const goal = input.studyGoalMinsPerDay

    for (const slot of slots) {
      if (scheduledStudy >= goal) break
      let cursor = slot.start
      while (cursor < slot.end && scheduledStudy < goal) {
        const blockEnd = addMinutes(cursor, FOCUS_BLOCK_MINS)
        if (blockEnd > slot.end) break

        const overlaps = fixedBlocks.some(
          (b) => cursor < b.end && blockEnd > b.start
        )
        if (overlaps) {
          cursor = addMinutes(cursor, 15)
          continue
        }

        const task = rankedTasks[taskCursor % rankedTasks.length]
        taskCursor++

        focusBlocks.push({
          id: `focus-${day.toISOString()}-${cursor.getTime()}`,
          kind: 'focus_suggestion',
          title: task ? `Focus: ${task.title}` : 'Study block',
          subtitle: task
            ? `${FOCUS_BLOCK_MINS} min · ${task.priority} priority`
            : `${FOCUS_BLOCK_MINS} min study session`,
          start: cursor,
          end: blockEnd,
          sourceType: task && isGitHubSyncedTask(task) ? 'github' : task ? 'task' : 'study',
          sourceId: task?.id,
          path: task ? '/tasks' : '/focus',
          suggested: true,
        })

        scheduledStudy += FOCUS_BLOCK_MINS
        cursor = addMinutes(blockEnd, 5)
      }
    }

    const blocks = [...fixedBlocks, ...focusBlocks].sort(
      (a, b) => a.start.getTime() - b.start.getTime()
    )

    return {
      day,
      label: isToday(day) ? `Today · ${format(day, 'EEE')}` : format(day, 'EEEE, MMM d'),
      isToday: isToday(day),
      blocks,
      studyGoalMins: goal,
      studyScheduledMins: scheduledStudy,
      openTaskCount: pendingTasks.filter((t) => {
        if (!t.due_date) return true
        return isSameDay(parseISO(t.due_date), day) || parseISO(t.due_date) >= day
      }).length,
    }
  })

  return {
    days: dayPlans,
    weekLabel: `${format(input.weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`,
    totalStudyGoalMins: input.studyGoalMinsPerDay * days.length,
    totalStudyScheduledMins: dayPlans.reduce((sum, d) => sum + d.studyScheduledMins, 0),
    pendingTasks: pendingTasks.length,
    githubTaskCount,
    prReviewCount,
  }
}
