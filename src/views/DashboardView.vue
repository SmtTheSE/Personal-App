<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useAuthStore } from '@/stores/auth'
import { useTasksStore } from '@/stores/tasks'
import { useProjectsStore } from '@/stores/projects'
import { useResourcesStore } from '@/stores/resources'
import NavBar from '@/components/layout/NavBar.vue'
import IOSCard from '@/components/ui/IOSCard.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
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
</script>

<template>
  <div>
    <NavBar :title="`${greeting}, ${displayName}`" large show-settings />

    <div class="space-y-6 px-4 py-4">
      <!-- Widget Grid -->
      <div class="grid grid-cols-2 gap-3">
        <IOSCard class="!p-4">
          <div class="flex items-center gap-2 text-ios-orange">
            <PhFlame :size="22" weight="fill" />
            <span class="ios-footnote font-semibold uppercase tracking-wide">Streak</span>
          </div>
          <p class="mt-2 text-[32px] font-bold leading-none text-black dark:text-white">
            {{ tasksStore.studyStreak }}
          </p>
          <p class="ios-caption mt-1 text-ios-tertiary-label">days active</p>
        </IOSCard>

        <IOSCard class="!p-4">
          <div class="flex items-center gap-2 text-ios-green">
            <PhCheckCircle :size="22" weight="fill" />
            <span class="ios-footnote font-semibold uppercase tracking-wide">Today</span>
          </div>
          <p class="mt-2 text-[32px] font-bold leading-none text-black dark:text-white">
            {{ tasksStore.completedToday.length }}
          </p>
          <p class="ios-caption mt-1 text-ios-tertiary-label">tasks done</p>
        </IOSCard>
      </div>

      <!-- Today's Tasks Widget -->
      <section>
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="ios-title2 text-black dark:text-white">Today's Focus</h2>
          <button type="button" class="ios-subhead text-ios-blue" @click="router.push('/tasks')">
            See all
          </button>
        </div>

        <IOSListGroup v-if="tasksStore.todayTasks.length">
          <IOSListItem
            v-for="task in tasksStore.todayTasks.slice(0, 5)"
            :key="task.id"
            :title="task.title"
            :subtitle="task.due_date ? format(new Date(task.due_date), 'MMM d') : undefined"
            @click="tasksStore.toggleComplete(task.id)"
          >
            <template #icon>
              <div
                class="flex h-6 w-6 items-center justify-center rounded-full border-2"
                :class="task.status === 'done' ? 'border-ios-green bg-ios-green' : 'border-ios-tertiary-label'"
              >
                <PhCheckCircle v-if="task.status === 'done'" :size="14" weight="fill" class="text-white" />
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>

        <IOSCard v-else class="text-center !p-6">
          <p class="ios-subhead text-ios-tertiary-label">No tasks for today</p>
          <button type="button" class="mt-2 ios-subhead text-ios-blue" @click="router.push('/tasks')">
            Add a task
          </button>
        </IOSCard>
      </section>

      <!-- Active Project Widget -->
      <section v-if="activeProject">
        <div class="mb-2 flex items-center justify-between px-1">
          <h2 class="ios-title2 text-black dark:text-white">Active Project</h2>
          <button type="button" class="ios-subhead text-ios-blue" @click="router.push('/projects')">
            All projects
          </button>
        </div>

        <IOSCard class="!p-4" @click="router.push(`/projects/${activeProject.id}`)">
          <div class="flex items-start gap-3">
            <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-ios-blue/10 text-ios-blue">
              <PhFolder :size="24" weight="fill" />
            </div>
            <div class="min-w-0 flex-1">
              <h3 class="ios-headline truncate text-black dark:text-white">{{ activeProject.title }}</h3>
              <p v-if="activeProject.description" class="ios-footnote mt-0.5 line-clamp-2 text-ios-tertiary-label">
                {{ activeProject.description }}
              </p>
              <div v-if="activeProject.tech_stack.length" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="tech in activeProject.tech_stack.slice(0, 4)"
                  :key="tech"
                  class="rounded-md bg-black/5 px-2 py-0.5 ios-caption text-ios-secondary-label dark:bg-white/10"
                >
                  {{ tech }}
                </span>
              </div>
            </div>
            <PhArrowRight :size="18" class="shrink-0 text-ios-tertiary-label" />
          </div>
        </IOSCard>
      </section>

      <!-- Quick Links -->
      <section>
        <h2 class="ios-title2 mb-2 px-1 text-black dark:text-white">Quick Access</h2>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="ios-card flex flex-col items-start gap-2 p-4 text-left active:scale-[0.98] transition-transform"
            @click="router.push('/resources')"
          >
            <PhBookmarkSimple :size="24" class="text-ios-purple" weight="fill" />
            <span class="ios-headline text-black dark:text-white">Vault</span>
            <span class="ios-caption text-ios-tertiary-label">{{ resourcesStore.resources.length }} saved</span>
          </button>
          <button
            type="button"
            class="ios-card flex flex-col items-start gap-2 p-4 text-left active:scale-[0.98] transition-transform"
            @click="router.push('/interview')"
          >
            <PhCode :size="24" class="text-ios-blue" weight="fill" />
            <span class="ios-headline text-black dark:text-white">Interview</span>
            <span class="ios-caption text-ios-tertiary-label">Problem tracker</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
