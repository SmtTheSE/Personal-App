<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useProjectsStore } from '@/stores/projects'
import { useResourcesStore } from '@/stores/resources'
import { useNotesStore } from '@/stores/notes'
import { useAnalyticsStore, useInterviewStore } from '@/stores/analytics'
import { useMilestonesStore } from '@/stores/milestones'
import { useSpreadsheetsStore } from '@/stores/spreadsheets'
import { useExamsStore } from '@/stores/exams'
import { useIntegrationsStore } from '@/stores/integrations'
import { useDataCleaningStore } from '@/stores/dataCleaning'
import { useUiStore } from '@/stores/ui'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import FloatingActionButton from '@/components/ui/FloatingActionButton.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import WidgetMetric from '@/components/ui/WidgetMetric.vue'
import DeadlineStrip from '@/components/ui/DeadlineStrip.vue'
import ExamCountdownCard from '@/components/calendar/ExamCountdownCard.vue'
import IOSRingProgress from '@/components/ui/IOSRingProgress.vue'
import {
  PhFlame,
  PhCheckCircle,
  PhFolder,
  PhArrowRight,
  PhBookmarkSimple,
  PhCode,
  PhTimer,
  PhNotePencil,
  PhChartLine,
  PhPlus,
  PhTable,
  PhLightning,
  PhCalendar,
  PhBrain,
  PhRocketLaunch,
  PhBroom,
} from '@phosphor-icons/vue'

const auth = useAuthStore()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const resourcesStore = useResourcesStore()
const notesStore = useNotesStore()
const analyticsStore = useAnalyticsStore()
const interviewStore = useInterviewStore()
const milestonesStore = useMilestonesStore()
const spreadsheetsStore = useSpreadsheetsStore()
const examsStore = useExamsStore()
const integrationsStore = useIntegrationsStore()
const dataCleaningStore = useDataCleaningStore()
const ui = useUiStore()
const router = useRouter()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const displayName = computed(() => auth.profile?.username ?? 'Student')
const activeProject = computed(() => projectsStore.activeProjects[0])
const studyGoal = computed(() => auth.profile?.study_goal_mins ?? 120)

async function handleRefresh() {
  await Promise.all([
    tasksStore.fetchTasks(),
    projectsStore.fetchProjects(),
    resourcesStore.fetchResources(),
    notesStore.fetchNotes(),
    analyticsStore.fetchSessions(),
    interviewStore.fetchProblems(),
    spreadsheetsStore.fetchSpreadsheets(),
    examsStore.fetchExams(),
    integrationsStore.fetchStatuses().catch(() => {}),
    Promise.resolve(dataCleaningStore.loadFromStorage()),
  ])
}
</script>

<template>
  <PageShell refreshable fab :on-refresh="handleRefresh">
    <template #header>
      <NavBar :title="`${greeting}, ${displayName}`" large show-settings show-search />
    </template>

    <div class="space-y-6 px-4 py-4">
      <div class="grid grid-cols-2 gap-3">
        <WidgetMetric
          :icon="PhFlame"
          icon-color="text-system-orange"
          label="Streak"
          :value="tasksStore.studyStreak"
          subtitle="days active"
        />
        <WidgetMetric
          :icon="PhCheckCircle"
          icon-color="text-system-green"
          label="Today"
          :value="tasksStore.completedToday.length"
          subtitle="tasks done"
        />
      </div>

      <button
        type="button"
        class="surface-elevated flex w-full items-center gap-4 p-4 text-left press-scale"
        :style="{ borderRadius: 'var(--radius-card)' }"
        @click="router.push('/focus')"
      >
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-system-blue/15 text-system-blue">
          <PhTimer :size="28" weight="fill" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-headline text-primary">Start Focus Session</p>
          <p class="text-footnote text-tertiary">
            {{ analyticsStore.todayMinutes }} min studied today · Pomodoro timer
          </p>
        </div>
        <PhArrowRight :size="18" class="shrink-0 text-tertiary" />
      </button>

      <button
        type="button"
        class="surface-elevated flex w-full items-center gap-4 p-4 text-left press-scale"
        :style="{ borderRadius: 'var(--radius-card)' }"
        @click="router.push('/sheets')"
      >
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-system-green/15 text-system-green">
          <PhTable :size="28" weight="fill" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-headline text-primary">Sheet Automations</p>
          <p class="text-footnote text-tertiary">
            {{ spreadsheetsStore.sorted.length }} workbook(s) · GPA, assignments, interview grids
          </p>
        </div>
        <div v-if="spreadsheetsStore.sorted.length" class="flex items-center gap-1 text-system-orange">
          <PhLightning :size="16" weight="fill" />
        </div>
        <PhArrowRight :size="18" class="shrink-0 text-tertiary" />
      </button>

      <button
        type="button"
        class="surface-elevated flex w-full items-center gap-4 p-4 text-left press-scale"
        :style="{ borderRadius: 'var(--radius-card)' }"
        @click="router.push('/data-cleaning')"
      >
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-system-orange/15 text-system-orange">
          <PhBroom :size="28" weight="fill" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-headline text-primary">Data Cleaning</p>
          <p class="text-footnote text-tertiary">
            CSV & Excel · column profiling, dedup, export
            <span v-if="dataCleaningStore.sorted.length"> · {{ dataCleaningStore.sorted.length }} session(s)</span>
          </p>
        </div>
        <PhArrowRight :size="18" class="shrink-0 text-tertiary" />
      </button>

      <button
        type="button"
        class="surface-elevated flex w-full items-center gap-4 p-4 text-left press-scale"
        :style="{ borderRadius: 'var(--radius-card)' }"
        @click="router.push('/deployments')"
      >
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-system-purple/15 text-system-purple">
          <PhRocketLaunch :size="28" weight="fill" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-headline text-primary">Deployments</p>
          <p class="text-footnote text-tertiary">
            <template v-if="integrationsStore.githubConnected || integrationsStore.vercelConnected">
              GitHub & Vercel linked · deploy analytics
            </template>
            <template v-else>
              Connect GitHub & Vercel for repo and deploy status
            </template>
          </p>
        </div>
        <PhArrowRight :size="18" class="shrink-0 text-tertiary" />
      </button>

      <section v-if="examsStore.nextExam">
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="text-title-2 text-primary">Next Exam</h2>
          <button type="button" class="text-subheadline text-system-blue press-scale" @click="router.push('/calendar')">
            <PhCalendar :size="16" class="mr-1 inline" />
            Calendar
          </button>
        </div>
        <ExamCountdownCard
          :exam="examsStore.nextExam"
          :days-until="examsStore.daysUntil(examsStore.nextExam)"
          :prep-progress="examsStore.prepProgress(examsStore.nextExam.id)"
          @open="router.push(`/exams/${examsStore.nextExam!.id}`)"
        />
      </section>

      <section v-if="interviewStore.reviewQueue.length">
        <button
          type="button"
          class="surface-elevated flex w-full items-center gap-3 p-4 text-left press-scale"
          :style="{ borderRadius: 'var(--radius-card)' }"
          @click="router.push('/interview')"
        >
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-system-orange/15 text-system-orange">
            <PhBrain :size="22" weight="fill" />
          </div>
          <div class="flex-1">
            <p class="text-headline text-primary">{{ interviewStore.reviewQueue.length }} problems to review</p>
            <p class="text-footnote text-tertiary">Spaced repetition queue</p>
          </div>
          <PhArrowRight :size="18" class="text-tertiary" />
        </button>
      </section>

      <section v-if="tasksStore.upcomingDeadlines.length">
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="text-title-2 text-primary">Upcoming</h2>
          <button type="button" class="text-subheadline text-system-blue press-scale" @click="router.push('/tasks')">
            All tasks
          </button>
        </div>
        <DeadlineStrip :tasks="tasksStore.upcomingDeadlines" @select="router.push('/tasks')" />
      </section>

      <section>
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="text-title-2 text-primary">Today's Focus</h2>
          <button type="button" class="text-subheadline text-system-blue press-scale" @click="router.push('/tasks')">
            See all
          </button>
        </div>

        <IOSListGroup v-if="tasksStore.todayTasks.length" :inset="false">
          <IOSListItem
            v-for="task in tasksStore.todayTasks.slice(0, 5)"
            :key="task.id"
            :title="task.title"
            :subtitle="task.due_date ? format(new Date(task.due_date), 'MMM d') : undefined"
            @click="tasksStore.toggleComplete(task.id)"
          >
            <template #icon>
              <div
                class="flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all"
                :class="task.status === 'done' ? 'border-system-green bg-system-green animate-check-bounce' : 'border-tertiary'"
              >
                <PhCheckCircle v-if="task.status === 'done'" :size="14" weight="fill" class="text-white" />
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>
        <p v-else class="px-1 text-footnote text-tertiary">No tasks due today — you're clear!</p>
      </section>

      <section v-if="activeProject">
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="text-title-2 text-primary">Active Project</h2>
          <button type="button" class="text-subheadline text-system-blue press-scale" @click="router.push('/projects')">
            All projects
          </button>
        </div>

        <button
          type="button"
          class="surface-elevated w-full p-4 text-left press-scale"
          :style="{ borderRadius: 'var(--radius-card)' }"
          @click="router.push(`/projects/${activeProject.id}`)"
        >
          <div class="flex items-start gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-system-blue/10 text-system-blue">
              <PhFolder :size="24" weight="fill" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="text-headline truncate text-primary">{{ activeProject.title }}</h3>
              <p v-if="activeProject.description" class="text-footnote mt-0.5 line-clamp-2 text-tertiary">
                {{ activeProject.description }}
              </p>
              <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-fill-tertiary)]">
                <div
                  class="h-full rounded-full bg-system-blue transition-all"
                  :style="{ width: `${milestonesStore.progressForProject(activeProject.id)}%` }"
                />
              </div>
              <p class="text-caption-2 mt-1 text-tertiary">
                {{ milestonesStore.progressForProject(activeProject.id) }}% milestones complete
              </p>
            </div>
            <PhArrowRight :size="18" class="shrink-0 text-tertiary" />
          </div>
        </button>
      </section>

      <section v-if="notesStore.recentNotes.length">
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="text-title-2 text-primary">Recent Notes</h2>
          <button type="button" class="text-subheadline text-system-blue press-scale" @click="router.push('/library')">
            Library
          </button>
        </div>
        <IOSListGroup :inset="false">
          <IOSListItem
            v-for="note in notesStore.recentNotes.slice(0, 3)"
            :key="note.id"
            :title="note.title"
            :subtitle="format(new Date(note.updated_at), 'MMM d')"
            @click="router.push(`/notes/${note.id}`)"
          >
            <template #icon>
              <PhNotePencil :size="20" class="text-system-purple" />
            </template>
          </IOSListItem>
        </IOSListGroup>
      </section>

      <section class="surface-elevated p-4" :style="{ borderRadius: 'var(--radius-card)' }">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-headline text-primary">Weekly Study Goal</h2>
            <p class="text-footnote text-tertiary">{{ analyticsStore.weeklyMinutes }} / {{ studyGoal }} minutes</p>
          </div>
          <IOSRingProgress
            :value="analyticsStore.weeklyMinutes"
            :max="studyGoal"
            :size="72"
            :stroke-width="8"
            label="week"
          />
        </div>
      </section>

      <section>
        <h2 class="text-title-2 mb-2 px-1 text-primary">Quick Access</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="surface-elevated flex flex-col items-start gap-2 p-4 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="router.push('/library')"
          >
            <PhBookmarkSimple :size="24" class="text-system-purple" weight="fill" />
            <span class="text-headline text-primary">Library</span>
            <span class="text-caption-1 text-tertiary">{{ resourcesStore.resources.length }} links · {{ notesStore.notes.length }} notes</span>
          </button>
          <button
            type="button"
            class="surface-elevated flex flex-col items-start gap-2 p-4 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="router.push('/interview')"
          >
            <PhCode :size="24" class="text-system-blue" weight="fill" />
            <span class="text-headline text-primary">Interview</span>
            <span class="text-caption-1 text-tertiary">{{ interviewStore.reviewQueue.length }} due for review</span>
          </button>
          <button
            type="button"
            class="surface-elevated flex flex-col items-start gap-2 p-4 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="router.push('/analytics')"
          >
            <PhChartLine :size="24" class="text-system-green" weight="fill" />
            <span class="text-headline text-primary">Analytics</span>
            <span class="text-caption-1 text-tertiary">Charts & heatmap</span>
          </button>
          <button
            type="button"
            class="surface-elevated flex flex-col items-start gap-2 p-4 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="ui.openQuickCapture()"
          >
            <PhPlus :size="24" class="text-system-orange" weight="bold" />
            <span class="text-headline text-primary">Quick Capture</span>
            <span class="text-caption-1 text-tertiary">Task, link, or note</span>
          </button>
        </div>
      </section>
    </div>

    <FloatingActionButton @click="ui.openQuickCapture()" />
  </PageShell>
</template>
