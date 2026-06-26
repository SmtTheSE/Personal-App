<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { format, parseISO } from 'date-fns'
import { useRouter } from 'vue-router'
import { useFocusTimer } from '@/composables/useFocusTimer'
import { useAnalyticsStore } from '@/stores/analytics'
import { useProjectsStore } from '@/stores/projects'
import { useUiStore } from '@/stores/ui'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { useAuthStore } from '@/stores/auth'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSContextMenu from '@/components/ui/IOSContextMenu.vue'
import { PhPlay, PhPause, PhArrowCounterClockwise, PhChartLine } from '@phosphor-icons/vue'
import type { TimerPhase } from '@/composables/useFocusTimer'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const projectsStore = useProjectsStore()
const analyticsStore = useAnalyticsStore()
const { run } = useAsyncAction()

const timer = useFocusTimer()
const phase = timer.phase
const topic = timer.topic
const projectId = timer.projectId
const isRunning = timer.isRunning
const progress = timer.progress
const displayTime = timer.displayTime
const phaseLabel = timer.phaseLabel
const completedFocusSessions = timer.completedFocusSessions

const phases: { id: TimerPhase; label: string; mins: number }[] = [
  { id: 'focus', label: 'Focus', mins: 25 },
  { id: 'shortBreak', label: 'Break', mins: 5 },
  { id: 'longBreak', label: 'Long', mins: 15 },
]

const loggedOnPause = ref(false)

const recentSessions = computed(() => analyticsStore.todayFocusSessions)

async function logCurrentSession() {
  const mins = timer.getElapsedMinutes()
  if (mins < 1 || phase.value !== 'focus') return

  const session = await run(() =>
    analyticsStore.logSession(
      topic.value,
      mins,
      projectId.value ?? undefined,
      timer.getSessionType()
    )
  )
  if (!session) return

  ui.showToast(`${mins} min logged`, 'success', {
    durationMs: 8000,
    action: {
      label: 'Undo',
      onAction: async () => {
        await run(() => analyticsStore.deleteSession(session.id), {
          successMessage: 'Session removed',
        })
      },
    },
  })
}

async function deleteSession(id: string) {
  await run(() => analyticsStore.deleteSession(id), { successMessage: 'Session deleted' })
}

function formatSessionTime(iso: string) {
  return format(parseISO(iso), 'h:mm a')
}

async function toggleTimer() {
  if (isRunning.value) {
    timer.pause()
    if (!loggedOnPause.value && phase.value === 'focus') {
      loggedOnPause.value = true
      await logCurrentSession()
    }
  } else {
    loggedOnPause.value = false
    timer.start()
  }
}

async function handleReset() {
  if (phase.value === 'focus' && timer.getElapsedMinutes() >= 1) {
    await logCurrentSession()
  }
  timer.reset()
  loggedOnPause.value = false
}

watch(phase, () => {
  loggedOnPause.value = false
})

onUnmounted(() => {
  timer.pause()
})
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Focus" large show-settings>
        <template #default>
          <div class="px-4 pb-2">
            <div class="flex gap-2">
              <button
                v-for="p in phases"
                :key="p.id"
                type="button"
                class="flex-1 rounded-full py-1.5 text-caption-1 font-medium press-scale"
                :class="phase === p.id ? 'bg-system-blue text-white' : 'fill-tertiary text-secondary'"
                :disabled="isRunning"
                @click="timer.setPhase(p.id)"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
        </template>
      </NavBar>
    </template>

    <div class="flex flex-col items-center px-4 py-8">
      <p class="text-subheadline mb-6 text-tertiary">{{ phaseLabel }}</p>

      <div class="relative mb-8 flex items-center justify-center" style="width: 260px; height: 260px">
        <svg width="260" height="260" class="absolute -rotate-90">
          <circle
            cx="130"
            cy="130"
            r="120"
            fill="none"
            class="stroke-[var(--color-fill-tertiary)]"
            stroke-width="10"
          />
          <circle
            cx="130"
            cy="130"
            r="120"
            fill="none"
            stroke="var(--color-system-blue)"
            stroke-width="10"
            stroke-linecap="round"
            :stroke-dasharray="2 * Math.PI * 120"
            :stroke-dashoffset="2 * Math.PI * 120 * (1 - progress)"
            class="transition-[stroke-dashoffset] duration-1000 linear"
          />
        </svg>
        <span class="text-[56px] font-light tabular-nums tracking-tight text-primary">{{ displayTime }}</span>
      </div>

      <div class="mb-6 w-full max-w-sm space-y-3">
        <IOSTextField v-model="topic" label="What are you working on?" :disabled="isRunning" />
        <div v-if="projectsStore.activeProjects.length" class="flex flex-wrap gap-2">
          <button
            v-for="proj in projectsStore.activeProjects.slice(0, 4)"
            :key="proj.id"
            type="button"
            class="rounded-full px-3 py-1 text-caption-1 press-scale"
            :class="projectId === proj.id ? 'bg-system-blue text-white' : 'fill-tertiary text-secondary'"
            :disabled="isRunning"
            @click="projectId = projectId === proj.id ? null : proj.id"
          >
            {{ proj.title }}
          </button>
        </div>
      </div>

      <div class="flex items-center gap-4">
        <button
          type="button"
          class="flex h-14 w-14 items-center justify-center rounded-full fill-tertiary text-secondary press-scale"
          aria-label="Reset timer"
          @click="handleReset"
        >
          <PhArrowCounterClockwise :size="24" />
        </button>
        <button
          type="button"
          class="flex h-20 w-20 items-center justify-center rounded-full bg-system-blue text-white shadow-lg press-scale"
          :aria-label="isRunning ? 'Pause' : 'Start'"
          @click="toggleTimer"
        >
          <PhPause v-if="isRunning" :size="36" weight="fill" />
          <PhPlay v-else :size="36" weight="fill" class="ml-1" />
        </button>
        <button
          type="button"
          class="flex h-14 w-14 items-center justify-center rounded-full fill-tertiary text-secondary press-scale"
          aria-label="View stats"
          @click="router.push('/analytics')"
        >
          <PhChartLine :size="24" />
        </button>
      </div>

      <div class="mt-10 grid w-full max-w-sm grid-cols-2 gap-3">
        <div class="surface-elevated p-4 text-center" :style="{ borderRadius: 'var(--radius-card)' }">
          <p class="text-title-2 text-primary">{{ analyticsStore.todayMinutes }}</p>
          <p class="text-caption-1 text-tertiary">min today</p>
        </div>
        <div class="surface-elevated p-4 text-center" :style="{ borderRadius: 'var(--radius-card)' }">
          <p class="text-title-2 text-primary">{{ completedFocusSessions }}</p>
          <p class="text-caption-1 text-tertiary">sessions</p>
        </div>
      </div>

      <div class="mt-6 w-full max-w-sm">
        <div class="mb-2 flex items-center justify-between px-1">
          <span class="text-footnote text-tertiary">Weekly goal</span>
          <span class="text-footnote text-secondary">
            {{ analyticsStore.weeklyMinutes }} / {{ auth.profile?.study_goal_mins ?? 120 }} min
          </span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-[var(--color-fill-tertiary)]">
          <div
            class="h-full rounded-full bg-system-blue transition-all duration-500"
            :style="{
              width: `${Math.min(100, (analyticsStore.weeklyMinutes / (auth.profile?.study_goal_mins ?? 120)) * 100)}%`,
            }"
          />
        </div>
      </div>

      <section v-if="recentSessions.length" class="mt-8 w-full max-w-sm">
        <h2 class="text-headline mb-2 px-1 text-primary">Today's sessions</h2>
        <IOSListGroup :inset="false">
          <IOSContextMenu
            v-for="session in recentSessions"
            :key="session.id"
            :items="[
              {
                id: 'delete',
                label: 'Delete',
                destructive: true,
                onSelect: () => deleteSession(session.id),
              },
            ]"
          >
            <IOSListItem
              :title="session.topic"
              :subtitle="`${session.duration_mins} min · ${formatSessionTime(session.started_at)}`"
            />
          </IOSContextMenu>
        </IOSListGroup>
        <p class="mt-2 px-1 text-caption-2 text-tertiary">Long-press a session to delete</p>
      </section>
    </div>
  </PageShell>
</template>
