<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { onMounted } from 'vue'
import { useWeeklyPlan } from '@/composables/useWeeklyPlan'
import { useGoogleCalendarStore } from '@/stores/googleCalendar'
import { useTasksStore } from '@/stores/tasks'
import { useAnalyticsStore } from '@/stores/analytics'
import { useExamsStore } from '@/stores/exams'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import WeekStrip from '@/components/calendar/WeekStrip.vue'
import WeekPlanDay from '@/components/planner/WeekPlanDay.vue'
import WidgetMetric from '@/components/ui/WidgetMetric.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhBrain, PhGithubLogo, PhListChecks, PhTimer } from '@phosphor-icons/vue'

const router = useRouter()
const planner = useWeeklyPlan()
const googleCalendar = useGoogleCalendarStore()
const tasksStore = useTasksStore()
const analyticsStore = useAnalyticsStore()
const examsStore = useExamsStore()

const selectedDayPlan = computed(() =>
  planner.plan.value.days.find((d) => d.day.toDateString() === planner.selectedDay.value.toDateString())
    ?? planner.plan.value.days[0]
)

function openBlock(blockId: string) {
  const day = selectedDayPlan.value
  const block = day?.blocks.find((b) => b.id === blockId)
  if (!block) return
  if (block.externalUrl) {
    window.open(block.externalUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (block.path) router.push(block.path)
}

async function handleRefresh() {
  await Promise.all([
    tasksStore.fetchTasks(),
    analyticsStore.fetchSessions(),
    examsStore.fetchExams(),
    googleCalendar.loadStatus().catch(() => {}),
    planner.refreshGoogleEvents(),
  ])
}

onMounted(() => {
  void handleRefresh()
})
</script>

<template>
  <PageShell refreshable :on-refresh="handleRefresh">
    <template #header>
      <NavBar title="This Week" large show-back>
        <WeekStrip
          :days="planner.weekDays.value"
          :selected-day="planner.selectedDay.value"
          :week-label="planner.plan.value.weekLabel"
          :event-count="planner.eventCountForDay"
          @select="planner.selectDay"
          @prev="planner.prevWeek"
          @next="planner.nextWeek"
          @today="planner.goToday"
        />
      </NavBar>
    </template>

    <div class="space-y-6 py-4">
      <div class="grid grid-cols-2 gap-3 px-4 sm:grid-cols-4">
        <WidgetMetric label="Open tasks" :value="String(planner.plan.value.pendingTasks)" :icon="PhListChecks" />
        <WidgetMetric
          label="PR reviews"
          :value="String(planner.plan.value.prReviewCount)"
          :icon="PhGithubLogo"
        />
        <WidgetMetric
          label="Study debt"
          :value="`${planner.plan.value.studyDebtMins ?? 0}m`"
          :icon="PhTimer"
        />
        <WidgetMetric
          label="Study goal"
          :value="`${planner.plan.value.totalStudyGoalMins}m`"
          :icon="PhBrain"
        />
      </div>

      <WeekPlanDay
        v-if="selectedDayPlan"
        :day="selectedDayPlan"
        @open-block="openBlock"
      />

      <div class="px-4">
        <IOSButton block variant="bordered" @click="router.push('/kanban')">
          Open dev kanban board
        </IOSButton>
      </div>

      <p class="px-4 text-caption-1 text-tertiary">
        Combines Google Calendar busy time, exams, due tasks, GitHub issues, and your daily study goal into suggested focus blocks.
      </p>
    </div>
  </PageShell>
</template>
