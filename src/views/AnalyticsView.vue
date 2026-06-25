<script setup lang="ts">
import { ref, computed } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { format, subDays } from 'date-fns'
import { useAnalyticsStore } from '@/stores/analytics'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import WidgetMetric from '@/components/ui/WidgetMetric.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSRingProgress from '@/components/ui/IOSRingProgress.vue'
import StudyHeatmap from '@/components/ui/StudyHeatmap.vue'
import { PhClock, PhFlame, PhPlus } from '@phosphor-icons/vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const analyticsStore = useAnalyticsStore()
const authStore = useAuthStore()
const tasksStore = useTasksStore()
const { run } = useAsyncAction()

const showSheet = ref(false)
const topic = ref('')
const duration = ref('30')

const dailyGoal = computed(() => authStore.profile?.study_goal_mins ?? 120)
const todayMinutes = computed(() => {
  const today = format(new Date(), 'yyyy-MM-dd')
  return analyticsStore.sessionsByDay.get(today) ?? 0
})

const chartData = computed(() => {
  const labels: string[] = []
  const data: number[] = []
  for (let i = 6; i >= 0; i--) {
    const day = subDays(new Date(), i)
    const key = format(day, 'yyyy-MM-dd')
    labels.push(format(day, 'EEE'))
    data.push((analyticsStore.sessionsByDay.get(key) ?? 0) / 60)
  }
  return {
    labels,
    datasets: [{
      label: 'Study Hours',
      data,
      backgroundColor: 'rgba(0, 122, 255, 0.75)',
      borderRadius: 6,
    }],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { display: false }, ticks: { color: '#8E8E93' } },
    x: { grid: { display: false }, ticks: { color: '#8E8E93' } },
  },
}

async function logSession() {
  if (!topic.value.trim()) return
  const result = await run(
    () => analyticsStore.logSession(topic.value.trim(), parseInt(duration.value) || 30),
    { successMessage: 'Session logged' }
  )
  if (!result) return
  topic.value = ''
  duration.value = '30'
  showSheet.value = false
}
</script>

<template>
  <PageShell :on-refresh="() => analyticsStore.fetchSessions()" refreshable>
    <template #header>
      <NavBar title="Analytics" large>
        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="Log session"
            @click="showSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="space-y-6 px-4 py-4">
      <div class="grid grid-cols-2 gap-3">
        <WidgetMetric
          :icon="PhClock"
          icon-color="text-system-blue"
          label="This Week"
          :value="`${Math.round(analyticsStore.weeklyMinutes / 60)}h`"
        />
        <WidgetMetric
          :icon="PhFlame"
          icon-color="text-system-orange"
          label="Streak"
          :value="tasksStore.studyStreak"
          subtitle="days"
        />
      </div>

      <div class="surface-elevated p-4" :style="{ borderRadius: 'var(--radius-card)' }">
        <h3 class="text-headline mb-4 text-primary">Daily Goal</h3>
        <div class="flex items-center justify-center py-2">
          <IOSRingProgress
            :value="todayMinutes"
            :max="dailyGoal"
            label="today"
            color="var(--color-system-green)"
          />
        </div>
      </div>

      <div class="surface-elevated p-4" :style="{ borderRadius: 'var(--radius-card)' }">
        <h3 class="text-headline mb-3 text-primary">Weekly Study Hours</h3>
        <div class="h-48">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </div>

      <div class="surface-elevated p-4" :style="{ borderRadius: 'var(--radius-card)' }">
        <h3 class="text-headline mb-3 text-primary">Activity</h3>
        <StudyHeatmap :data="analyticsStore.sessionsByDay" :weeks="12" />
      </div>
    </div>

    <IOSSheet :open="showSheet" title="Log Study Session" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="topic" label="Topic" placeholder="What did you study?" clearable />
        <IOSTextField v-model="duration" label="Duration (minutes)" type="number" />
        <IOSButton block @click="logSession">Log Session</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
