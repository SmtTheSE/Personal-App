import { ref, computed, type Ref } from 'vue'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { useTasksStore } from '@/stores/tasks'
import { useExamsStore } from '@/stores/exams'
import { useAnalyticsStore, useInterviewStore } from '@/stores/analytics'

export type CalendarEventType = 'task' | 'exam' | 'focus' | 'review'

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  title: string
  subtitle?: string
  date: Date
  color: string
  path?: string
}

export function useCalendarWeek(anchorDate?: Ref<Date>) {
  const weekStart = ref(startOfWeek(anchorDate?.value ?? new Date(), { weekStartsOn: 1 }))
  const selectedDay = ref(new Date())

  const tasksStore = useTasksStore()
  const examsStore = useExamsStore()
  const analyticsStore = useAnalyticsStore()
  const interviewStore = useInterviewStore()

  const weekDays = computed(() => {
    const end = endOfWeek(weekStart.value, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart.value, end })
  })

  const weekLabel = computed(() => {
    const end = endOfWeek(weekStart.value, { weekStartsOn: 1 })
    return `${format(weekStart.value, 'MMM d')} – ${format(end, 'MMM d')}`
  })

  function eventCountForDay(day: Date) {
    return allEvents.value.filter((e) => isSameDay(e.date, day)).length
  }

  const allEvents = computed((): CalendarEvent[] => {
    const events: CalendarEvent[] = []

    for (const task of tasksStore.tasks) {
      if (!task.due_date || task.status === 'done') continue
      events.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        subtitle: task.priority,
        date: parseISO(task.due_date),
        color: 'var(--color-system-blue)',
        path: '/tasks',
      })
    }

    for (const exam of examsStore.exams) {
      events.push({
        id: `exam-${exam.id}`,
        type: 'exam',
        title: exam.title,
        subtitle: exam.course ?? undefined,
        date: parseISO(exam.exam_at),
        color: `var(--color-system-${exam.color})`,
        path: `/exams/${exam.id}`,
      })
    }

    for (const session of analyticsStore.sessions) {
      if (session.session_type !== 'focus') continue
      events.push({
        id: `focus-${session.id}`,
        type: 'focus',
        title: session.topic,
        subtitle: `${session.duration_mins} min`,
        date: parseISO(session.started_at),
        color: 'var(--color-system-purple)',
        path: '/focus',
      })
    }

    for (const problem of interviewStore.dueForReview) {
      const dateStr = problem.next_review_at ?? problem.revisit_date
      if (!dateStr) continue
      events.push({
        id: `review-${problem.id}`,
        type: 'review',
        title: problem.title,
        subtitle: 'Interview review',
        date: parseISO(dateStr),
        color: 'var(--color-system-orange)',
        path: '/interview',
      })
    }

    return events
  })

  const selectedDayEvents = computed(() =>
    allEvents.value
      .filter((e) => isSameDay(e.date, selectedDay.value))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  )

  function prevWeek() {
    weekStart.value = subWeeks(weekStart.value, 1)
  }

  function nextWeek() {
    weekStart.value = addWeeks(weekStart.value, 1)
  }

  function goToday() {
    const today = new Date()
    weekStart.value = startOfWeek(today, { weekStartsOn: 1 })
    selectedDay.value = today
  }

  function selectDay(day: Date) {
    selectedDay.value = day
  }

  return {
    weekStart,
    selectedDay,
    weekDays,
    weekLabel,
    selectedDayEvents,
    eventCountForDay,
    prevWeek,
    nextWeek,
    goToday,
    selectDay,
  }
}
