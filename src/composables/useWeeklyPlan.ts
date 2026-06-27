import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useCalendarWeek } from '@/composables/useCalendarWeek'
import { buildWeeklyPlan } from '@/lib/planner/weeklyPlan'

export function useWeeklyPlan() {
  const auth = useAuthStore()
  const tasksStore = useTasksStore()
  const calendar = useCalendarWeek()

  const plan = computed(() =>
    buildWeeklyPlan({
      weekStart: calendar.weekStart.value,
      events: calendar.allEvents.value,
      tasks: tasksStore.tasks,
      studyGoalMinsPerDay: auth.profile?.study_goal_mins ?? 120,
    })
  )

  return {
    ...calendar,
    plan,
  }
}
