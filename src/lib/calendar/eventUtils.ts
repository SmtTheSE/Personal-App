import {
  format,
  isSameDay,
  differenceInMinutes,
  isAfter,
  isBefore,
  startOfDay,
  endOfDay,
} from 'date-fns'
import type { CalendarEvent } from '@/composables/useCalendarWeek'

export function formatEventTimeRange(event: CalendarEvent) {
  if (event.allDay) return 'All day'
  if (!event.endDate) return format(event.date, 'h:mm a')
  return `${format(event.date, 'h:mm a')} – ${format(event.endDate, 'h:mm a')}`
}

export function formatEventSubtitle(event: CalendarEvent) {
  const parts: string[] = []
  const time = formatEventTimeRange(event)
  if (time !== 'All day') parts.push(time)
  if (event.location) parts.push(event.location)
  if (event.subtitle && !parts.includes(event.subtitle)) parts.unshift(event.subtitle)
  return parts.filter(Boolean).join(' · ') || undefined
}

export function sortDayEvents(events: CalendarEvent[]) {
  return [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1
    return a.sortKey - b.sortKey
  })
}

export function splitDayEvents(events: CalendarEvent[]) {
  const sorted = sortDayEvents(events)
  return {
    allDay: sorted.filter((e) => e.allDay),
    timed: sorted.filter((e) => !e.allDay),
  }
}

export function eventsForDay(events: CalendarEvent[], day: Date) {
  return events.filter((event) => isSameDay(event.date, day))
}

export function findNextEvent(events: CalendarEvent[], from = new Date()) {
  const upcoming = events
    .filter((event) => {
      const end = event.endDate ?? event.date
      return isAfter(end, from)
    })
    .sort((a, b) => a.sortKey - b.sortKey)

  return upcoming[0] ?? null
}

export function minutesUntil(event: CalendarEvent, from = new Date()) {
  const start = event.date
  if (isBefore(start, from) && event.endDate && isAfter(event.endDate, from)) return 0
  return Math.max(0, differenceInMinutes(start, from))
}

export function nextUpLabel(event: CalendarEvent, from = new Date()) {
  const mins = minutesUntil(event, from)
  if (mins === 0 && event.endDate && isAfter(event.endDate, from)) return 'Happening now'
  if (mins < 60) return `in ${mins} min`
  const hours = Math.floor(mins / 60)
  const rem = mins % 60
  if (hours < 24) return rem > 0 ? `in ${hours}h ${rem}m` : `in ${hours}h`
  return format(event.date, 'EEE · h:mm a')
}

export function groupEventsByDay(events: CalendarEvent[], days: Date[]) {
  return days.map((day) => ({
    day,
    label: format(day, 'EEEE, MMM d'),
    isToday: isSameDay(day, new Date()),
    events: sortDayEvents(eventsForDay(events, day)),
  }))
}

export function dayRangeIso(start: Date, end: Date) {
  return {
    timeMin: startOfDay(start).toISOString(),
    timeMax: endOfDay(end).toISOString(),
  }
}
