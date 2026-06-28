import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useAnalyticsStore } from '@/stores/analytics'
import { useExamsStore } from '@/stores/exams'
import { useCalendarWeek } from '@/composables/useCalendarWeek'
import { buildWeeklyPlan } from '@/lib/planner/weeklyPlan'

export function useWeeklyPlan() {
  const auth = useAuthStore()
  const tasksStore = useTasksStore()
  const googleCalendar = useGoogleCalendarStore()
  const analyticsStore = useAnalyticsStore()
  const examsStore = useExamsStore()
  const calendar = useCalendarWeek()

  const studyLoggedMinsByDay = computed(() => {
    const map: Record<string, number> = {}
    for (const session of analyticsStore.sessions) {
      if ((session.session_type ?? 'focus') !== 'focus') continue
      const day = session.started_at.split('T')[0]
      map[day] = (map[day] ?? 0) + session.duration_mins
    }
    return map
  })

  const plan = computed(() =>
    buildWeeklyPlan({
      weekStart: calendar.weekStart.value,
      events: calendar.allEvents.value,
      tasks: tasksStore.tasks,
      studyGoalMinsPerDay: auth.profile?.study_goal_mins ?? 120,
      travelBufferMins: googleCalendar.settings.travel_buffer_mins ?? 0,
      studyLoggedMinsByDay: studyLoggedMinsByDay.value,
      exams: examsStore.exams.map((e) => ({
        id: e.id,
        title: e.title,
        exam_at: e.exam_at,
        course: e.course ?? null,
      })),
      prReviewCount: tasksStore.tasks.filter(
        (t) => t.kanban_column === 'review' && t.status !== 'done'
      ).length,
    })
  )

  return {
    ...calendar,
    plan,
  }
}
