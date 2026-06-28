import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useCalendarWeek } from '@/composables/useCalendarWeek'
import { buildWeeklyPlan } from '@/lib/planner/weeklyPlan'

export function useWeeklyPlan() {
  const auth = useAuthStore()
  const tasksStore = useTasksStore()
  const googleCalendar = useGoogleCalendarStore()
  const calendar = useCalendarWeek()

  const plan = computed(() =>
    buildWeeklyPlan({
      weekStart: calendar.weekStart.value,
      events: calendar.allEvents.value,
      tasks: tasksStore.tasks,
      studyGoalMinsPerDay: auth.profile?.study_goal_mins ?? 120,
      travelBufferMins: googleCalendar.settings.travel_buffer_mins ?? 0,
    })
  )

  return {
    ...calendar,
    plan,
  }
}
