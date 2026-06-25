<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { format, subDays } from 'date-fns'
import { useAnalyticsStore } from '@/stores/analytics'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import NavBar from '@/components/layout/NavBar.vue'
import IOSCard from '@/components/ui/IOSCard.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import { PhClock, PhFlame, PhPlus } from '@phosphor-icons/vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const analyticsStore = useAnalyticsStore()
const authStore = useAuthStore()
const tasksStore = useTasksStore()

const showSheet = ref(false)
const topic = ref('')
const duration = ref('30')

onMounted(() => analyticsStore.fetchSessions())

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
    datasets: [
      {
        label: 'Study Hours',
        data,
        backgroundColor: 'rgba(0, 122, 255, 0.7)',
        borderRadius: 6,
      },
    ],
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { display: false } },
    x: { grid: { display: false } },
  },
}

async function logSession() {
  if (!topic.value.trim()) return
  await analyticsStore.logSession(topic.value.trim(), parseInt(duration.value) || 30)
  topic.value = ''
  duration.value = '30'
  showSheet.value = false
}
</script>

<template>
  <div>
    <NavBar title="Analytics" large>
      <div class="flex justify-end px-4 pb-2">
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-ios-blue text-white" @click="showSheet = true">
          <PhPlus :size="20" weight="bold" />
        </button>
      </div>
    </NavBar>

    <div class="space-y-6 px-4 py-4">
      <div class="grid grid-cols-2 gap-3">
        <IOSCard class="!p-4">
          <PhClock :size="22" class="text-ios-blue" weight="fill" />
          <p class="mt-2 text-[28px] font-bold text-black dark:text-white">
            {{ Math.round(analyticsStore.weeklyMinutes / 60) }}h
          </p>
          <p class="ios-caption text-ios-tertiary-label">This week</p>
        </IOSCard>
        <IOSCard class="!p-4">
          <PhFlame :size="22" class="text-ios-orange" weight="fill" />
          <p class="mt-2 text-[28px] font-bold text-black dark:text-white">{{ tasksStore.studyStreak }}</p>
          <p class="ios-caption text-ios-tertiary-label">Day streak</p>
        </IOSCard>
      </div>

      <IOSCard title="Weekly Study Hours" class="!p-4">
        <div class="h-48">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </IOSCard>

      <IOSCard class="!p-4">
        <p class="ios-footnote text-ios-tertiary-label">Daily goal</p>
        <p class="ios-title2 mt-1 text-black dark:text-white">
          {{ authStore.profile?.study_goal_mins ?? 120 }} min/day
        </p>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            class="h-full rounded-full bg-ios-green transition-all"
            :style="{ width: `${Math.min(100, (analyticsStore.weeklyMinutes / 7 / (authStore.profile?.study_goal_mins ?? 120)) * 100)}%` }"
          />
        </div>
      </IOSCard>
    </div>

    <IOSSheet :open="showSheet" title="Log Study Session" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="topic" label="Topic" placeholder="What did you study?" />
        <IOSTextField v-model="duration" label="Duration (minutes)" type="number" placeholder="30" />
        <IOSButton block @click="logSession">Log Session</IOSButton>
      </div>
    </IOSSheet>
  </div>
</template>
