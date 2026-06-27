import { ref, computed, watch, type Ref } from 'vue'
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  parseISO,
  addWeeks,
  subWeeks,
  endOfDay,
  startOfDay,
  addDays,
  isToday,
} from 'date-fns'
import { useTasksStore } from '@/stores/tasks'
import { useExamsStore } from '@/stores/exams'
import { useAnalyticsStore, useInterviewStore } from '@/stores/analytics'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { findNextEvent, sortDayEvents } from '@/lib/calendar/eventUtils'

export type CalendarEventType = 'task' | 'exam' | 'focus' | 'review' | 'google'

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  title: string
  subtitle?: string
  date: Date
  endDate?: Date
  allDay: boolean
  sortKey: number
  location?: string
  externalUrl?: string
  color: string
  path?: string
}

function buildLocalEvents(): CalendarEvent[] {
  const tasksStore = useTasksStore()
  const examsStore = useExamsStore()
  const analyticsStore = useAnalyticsStore()
  const interviewStore = useInterviewStore()
  const events: CalendarEvent[] = []

  for (const task of tasksStore.tasks) {
    if (!task.due_date || task.status === 'done') continue
    const date = startOfDay(parseISO(task.due_date))
    events.push({
      id: `task-${task.id}`,
      type: 'task',
      title: task.title,
      subtitle: `${task.priority} priority`,
      date,
      allDay: true,
      sortKey: date.getTime(),
      color: 'var(--color-system-blue)',
      path: '/tasks',
    })
  }

  for (const exam of examsStore.exams) {
    const date = parseISO(exam.exam_at)
    const endDate = new Date(date.getTime() + 2 * 60 * 60 * 1000)
    events.push({
      id: `exam-${exam.id}`,
      type: 'exam',
      title: exam.title,
      subtitle: exam.course ?? undefined,
      date,
      endDate,
      allDay: false,
      sortKey: date.getTime(),
      location: exam.location ?? undefined,
      color: `var(--color-system-${exam.color})`,
      path: `/exams/${exam.id}`,
    })
  }

  for (const session of analyticsStore.sessions) {
    if (session.session_type !== 'focus') continue
    const date = parseISO(session.started_at)
    events.push({
      id: `focus-${session.id}`,
      type: 'focus',
      title: session.topic,
      subtitle: `${session.duration_mins} min`,
      date,
      endDate: new Date(date.getTime() + session.duration_mins * 60 * 1000),
      allDay: false,
      sortKey: date.getTime(),
      color: 'var(--color-system-purple)',
      path: '/focus',
    })
  }

  for (const problem of interviewStore.dueForReview) {
    const dateStr = problem.next_review_at ?? problem.revisit_date
    if (!dateStr) continue
    const date = startOfDay(parseISO(dateStr))
    events.push({
      id: `review-${problem.id}`,
      type: 'review',
      title: problem.title,
      subtitle: 'Interview review',
      date,
      allDay: true,
      sortKey: date.getTime(),
      color: 'var(--color-system-orange)',
      path: '/interview',
    })
  }

  return events
}

export function useCalendarWeek(anchorDate?: Ref<Date>) {
  const weekStart = ref(startOfWeek(anchorDate?.value ?? new Date(), { weekStartsOn: 1 }))
  const selectedDay = ref(new Date())

  const googleCalendar = useGoogleCalendarStore()

  async function refreshGoogleEvents() {
    await googleCalendar.loadStatus().catch(() => {})
    if (!googleCalendar.connected) return
    const end = endOfWeek(weekStart.value, { weekStartsOn: 1 })
    await googleCalendar.loadGoogleEvents(weekStart.value.toISOString(), endOfDay(end).toISOString())
  }

  watch(weekStart, () => {
    void refreshGoogleEvents()
  }, { immediate: true })

  const weekDays = computed(() => {
    const end = endOfWeek(weekStart.value, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: weekStart.value, end })
  })

  const weekLabel = computed(() => {
    const end = endOfWeek(weekStart.value, { weekStartsOn: 1 })
    return `${format(weekStart.value, 'MMM d')} – ${format(end, 'MMM d')}`
  })

  const allEvents = computed((): CalendarEvent[] => {
    const events = buildLocalEvents()

    for (const block of googleCalendar.googleEvents) {
      const date = parseISO(block.start)
      const endDate = parseISO(block.end)
      events.push({
        id: `google-${block.id}`,
        type: 'google',
        title: block.title,
        subtitle: block.location ?? 'From Google Calendar',
        date,
        endDate,
        allDay: block.allDay,
        sortKey: block.allDay ? startOfDay(date).getTime() : date.getTime(),
        location: block.location ?? undefined,
        externalUrl: block.htmlLink ?? undefined,
        color: 'var(--color-system-red)',
      })
    }

    return events
  })

  const selectedDayEvents = computed(() =>
    sortDayEvents(allEvents.value.filter((e) => isSameDay(e.date, selectedDay.value)))
  )

  const todayEvents = computed(() =>
    sortDayEvents(allEvents.value.filter((e) => isSameDay(e.date, new Date())))
  )

  const nextUpEvent = computed(() => findNextEvent(allEvents.value))

  function eventCountForDay(day: Date) {
    return allEvents.value.filter((e) => isSameDay(e.date, day)).length
  }

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
    todayEvents,
    nextUpEvent,
    allEvents,
    eventCountForDay,
    refreshGoogleEvents,
    prevWeek,
    nextWeek,
    goToday,
    selectDay,
  }
}

export function useScheduleHorizon(daysAhead = 14) {
  const googleCalendar = useGoogleCalendarStore()
  const horizonStart = startOfDay(new Date())
  const horizonEnd = endOfDay(addDays(horizonStart, daysAhead))

  async function refresh() {
    await googleCalendar.loadStatus().catch(() => {})
    if (!googleCalendar.connected) return
    await googleCalendar.loadGoogleEvents(horizonStart.toISOString(), horizonEnd.toISOString())
  }

  const allEvents = computed(() => {
    const events = buildLocalEvents()
    for (const block of googleCalendar.googleEvents) {
      const date = parseISO(block.start)
      const endDate = parseISO(block.end)
      events.push({
        id: `google-${block.id}`,
        type: 'google',
        title: block.title,
        subtitle: block.location ?? 'From Google Calendar',
        date,
        endDate,
        allDay: block.allDay,
        sortKey: block.allDay ? startOfDay(date).getTime() : date.getTime(),
        location: block.location ?? undefined,
        externalUrl: block.htmlLink ?? undefined,
        color: 'var(--color-system-red)',
      })
    }
    return events
  })

  const daySections = computed(() => {
    const days = eachDayOfInterval({ start: horizonStart, end: horizonEnd })
    return days.map((day) => ({
      day,
      isToday: isToday(day),
      label: isToday(day) ? 'Today' : format(day, 'EEEE, MMM d'),
      events: sortDayEvents(allEvents.value.filter((e) => isSameDay(e.date, day))),
    })).filter((section) => section.events.length > 0 || section.isToday)
  })

  const nextUpEvent = computed(() => findNextEvent(allEvents.value))

  return {
    allEvents,
    daySections,
    nextUpEvent,
    todayEvents: computed(() =>
      sortDayEvents(allEvents.value.filter((e) => isSameDay(e.date, new Date())))
    ),
    refresh,
    connected: computed(() => googleCalendar.connected),
  }
}
