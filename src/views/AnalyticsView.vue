<script setup lang="ts">
import { ref, computed } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { format, subDays, parseISO } from 'date-fns'
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
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSSwipeRow from '@/components/ui/IOSSwipeRow.vue'
import StudyHeatmap from '@/components/ui/StudyHeatmap.vue'
import { PhClock, PhFlame, PhPlus, PhTrash } from '@phosphor-icons/vue'
import type { SwipeAction } from '@/composables/useSwipeGesture'
import { useHaptics } from '@/composables/useHaptics'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

const analyticsStore = useAnalyticsStore()
const authStore = useAuthStore()
const tasksStore = useTasksStore()
const { run } = useAsyncAction()
const { trigger } = useHaptics()

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

async function deleteSession(id: string) {
  await run(() => analyticsStore.deleteSession(id), { successMessage: 'Session deleted' })
}

function formatSessionDate(iso: string) {
  return format(parseISO(iso), 'MMM d, h:mm a')
}

const recentSessions = computed(() => analyticsStore.focusSessions.slice(0, 20))

function swipeActions(sessionId: string): SwipeAction[] {
  return [
    {
      id: 'delete',
      label: 'Delete',
      color: '#fff',
      background: 'var(--color-system-red)',
      side: 'trailing',
      onAction: async () => {
        await deleteSession(sessionId)
        trigger('warning')
      },
    },
  ]
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

      <section v-if="recentSessions.length">
        <h3 class="text-headline mb-2 text-primary">Recent sessions</h3>
        <IOSListGroup :inset="false">
          <IOSSwipeRow
            v-for="session in recentSessions"
            :key="session.id"
            :actions="swipeActions(session.id)"
          >
            <IOSListItem
              :title="session.topic"
              :subtitle="`${session.duration_mins} min · ${formatSessionDate(session.started_at)}`"
            >
              <template #trailing>
                <button
                  type="button"
                  class="flex h-9 w-9 items-center justify-center rounded-full text-system-red press-scale"
                  aria-label="Delete session"
                  @click.stop="deleteSession(session.id)"
                >
                  <PhTrash :size="18" />
                </button>
              </template>
            </IOSListItem>
          </IOSSwipeRow>
        </IOSListGroup>
        <p class="mt-2 text-caption-2 text-tertiary">Swipe left or tap the trash icon to delete</p>
      </section>
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
