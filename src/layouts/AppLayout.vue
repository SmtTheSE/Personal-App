<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import TabBar from '@/components/layout/TabBar.vue'
import GlobalSearch from '@/components/ui/GlobalSearch.vue'
import QuickCaptureSheet from '@/components/ui/QuickCaptureSheet.vue'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useProjectsStore } from '@/stores/projects'
import { useResourcesStore } from '@/stores/resources'
import { useTasksStore } from '@/stores/tasks'
import { useNotesStore } from '@/stores/notes'
import { useMilestonesStore } from '@/stores/milestones'
import { useAnalyticsStore, useInterviewStore } from '@/stores/analytics'
import { useSpreadsheetsStore } from '@/stores/spreadsheets'
import { useExamsStore } from '@/stores/exams'
import { formatSupabaseError } from '@/lib/errors'

const auth = useAuthStore()
const ui = useUiStore()
const projectsStore = useProjectsStore()
const resourcesStore = useResourcesStore()
const tasksStore = useTasksStore()
const notesStore = useNotesStore()
const milestonesStore = useMilestonesStore()
const spreadsheetsStore = useSpreadsheetsStore()
const examsStore = useExamsStore()
const analyticsStore = useAnalyticsStore()
const interviewStore = useInterviewStore()

onMounted(async () => {
  try {
    await auth.ensureProfile()
    await Promise.all([
      projectsStore.fetchProjects(),
      resourcesStore.fetchResources(),
      tasksStore.fetchTasks(),
      notesStore.fetchNotes(),
      milestonesStore.fetchMilestones(),
      spreadsheetsStore.fetchSpreadsheets(),
      examsStore.fetchExams(),
      analyticsStore.fetchSessions(),
      interviewStore.fetchProblems(),
    ])
    tasksStore.subscribeToRealtime()
  } catch (error) {
    ui.showToast(formatSupabaseError(error), 'error', 6000)
  }
})

onUnmounted(() => {
  tasksStore.unsubscribeRealtime()
})
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-system-grouped-bg)] dark:bg-[var(--color-system-grouped-bg-dark)]">
    <RouterView />
    <TabBar />
    <GlobalSearch />
    <QuickCaptureSheet />
  </div>
</template>
