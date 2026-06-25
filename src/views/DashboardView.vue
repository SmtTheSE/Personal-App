<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useProjectsStore } from '@/stores/projects'
import { useResourcesStore } from '@/stores/resources'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import WidgetMetric from '@/components/ui/WidgetMetric.vue'
import {
  PhFlame,
  PhCheckCircle,
  PhFolder,
  PhArrowRight,
  PhBookmarkSimple,
  PhCode,
} from '@phosphor-icons/vue'

const auth = useAuthStore()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const resourcesStore = useResourcesStore()
const router = useRouter()

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
})

const displayName = computed(() => auth.profile?.username ?? 'Student')
const activeProject = computed(() => projectsStore.activeProjects[0])

async function handleRefresh() {
  await Promise.all([
    tasksStore.fetchTasks(),
    projectsStore.fetchProjects(),
    resourcesStore.fetchResources(),
  ])
}
</script>

<template>
  <PageShell refreshable :on-refresh="handleRefresh">
    <template #header>
      <NavBar :title="`${greeting}, ${displayName}`" large show-settings />
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
              <div v-if="activeProject.tech_stack.length" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="tech in activeProject.tech_stack.slice(0, 4)"
                  :key="tech"
                  class="rounded-md fill-tertiary px-2 py-0.5 text-caption-1 text-secondary"
                >
                  {{ tech }}
                </span>
              </div>
            </div>
            <PhArrowRight :size="18" class="shrink-0 text-tertiary" />
          </div>
        </button>
      </section>

      <section>
        <h2 class="text-title-2 mb-2 px-1 text-primary">Quick Access</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="surface-elevated flex flex-col items-start gap-2 p-4 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="router.push('/resources')"
          >
            <PhBookmarkSimple :size="24" class="text-system-purple" weight="fill" />
            <span class="text-headline text-primary">Vault</span>
            <span class="text-caption-1 text-tertiary">{{ resourcesStore.resources.length }} saved</span>
          </button>
          <button
            type="button"
            class="surface-elevated flex flex-col items-start gap-2 p-4 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="router.push('/interview')"
          >
            <PhCode :size="24" class="text-system-blue" weight="fill" />
            <span class="text-headline text-primary">Interview</span>
            <span class="text-caption-1 text-tertiary">Problem tracker</span>
          </button>
        </div>
      </section>
    </div>
  </PageShell>
</template>
