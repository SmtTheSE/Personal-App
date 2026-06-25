<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import TabBar from '@/components/layout/TabBar.vue'
import { useProjectsStore } from '@/stores/projects'
import { useResourcesStore } from '@/stores/resources'
import { useTasksStore } from '@/stores/tasks'
import { useAnalyticsStore, useInterviewStore } from '@/stores/analytics'

const projectsStore = useProjectsStore()
const resourcesStore = useResourcesStore()
const tasksStore = useTasksStore()
const analyticsStore = useAnalyticsStore()
const interviewStore = useInterviewStore()

onMounted(async () => {
  await Promise.all([
    projectsStore.fetchProjects(),
    resourcesStore.fetchResources(),
    tasksStore.fetchTasks(),
    analyticsStore.fetchSessions(),
    interviewStore.fetchProblems(),
  ])
  tasksStore.subscribeToRealtime()
})

onUnmounted(() => {
  tasksStore.unsubscribeRealtime()
})
</script>

<template>
  <div class="min-h-dvh bg-[var(--color-system-grouped-bg)] dark:bg-[var(--color-system-grouped-bg-dark)]">
    <RouterView />
    <TabBar />
  </div>
</template>
