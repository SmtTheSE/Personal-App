<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { gradientFromString, initialsFromString } from '@/lib/color'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import { PhPlus, PhGithubLogo, PhGlobe, PhFolder, PhSquaresFour, PhList } from '@phosphor-icons/vue'
import type { ProjectStatus } from '@/types'

const projectsStore = useProjectsStore()
const router = useRouter()

const showSheet = ref(false)
const viewMode = ref<'list' | 'grid'>('list')
const title = ref('')
const description = ref('')
const techStack = ref('')
const repoUrl = ref('')
const status = ref<ProjectStatus>('active')

const statusColors: Record<ProjectStatus, 'green' | 'orange' | 'blue' | 'neutral'> = {
  active: 'green',
  paused: 'orange',
  completed: 'blue',
  archived: 'neutral',
}

async function createProject() {
  if (!title.value.trim()) return
  const project = await projectsStore.createProject({
    title: title.value.trim(),
    description: description.value || undefined,
    tech_stack: techStack.value ? techStack.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
    repo_url: repoUrl.value || undefined,
    status: status.value,
  })
  title.value = ''
  description.value = ''
  techStack.value = ''
  repoUrl.value = ''
  showSheet.value = false
  router.push(`/projects/${project.id}`)
}
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Projects" large>
        <div class="flex items-center justify-between px-4 pb-2">
          <div class="flex gap-1 rounded-lg fill-tertiary p-0.5">
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-md press-scale"
              :class="viewMode === 'list' ? 'bg-white shadow-sm dark:bg-[var(--color-secondary-grouped-bg-dark)]' : ''"
              aria-label="List view"
              @click="viewMode = 'list'"
            >
              <PhList :size="18" />
            </button>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-md press-scale"
              :class="viewMode === 'grid' ? 'bg-white shadow-sm dark:bg-[var(--color-secondary-grouped-bg-dark)]' : ''"
              aria-label="Grid view"
              @click="viewMode = 'grid'"
            >
              <PhSquaresFour :size="18" />
            </button>
          </div>
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            aria-label="Add project"
            @click="showSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div
      class="gap-4 px-4 py-4"
      :class="viewMode === 'grid' ? 'grid grid-cols-2' : 'flex flex-col space-y-4'"
    >
      <button
        v-for="project in projectsStore.projects"
        :key="project.id"
        type="button"
        class="surface-elevated w-full overflow-hidden text-left press-scale"
        :style="{ borderRadius: 'var(--radius-card)' }"
        @click="router.push(`/projects/${project.id}`)"
      >
        <div
          class="flex h-20 items-center justify-center text-2xl font-bold text-white"
          :style="{ background: gradientFromString(project.title) }"
        >
          {{ initialsFromString(project.title) }}
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between gap-2">
            <h3 class="text-headline truncate text-primary">{{ project.title }}</h3>
            <IOSChip :label="project.status" :color="statusColors[project.status]" selected />
          </div>
          <p v-if="project.description && viewMode === 'list'" class="text-footnote mt-1 line-clamp-2 text-tertiary">
            {{ project.description }}
          </p>
          <div v-if="project.tech_stack.length && viewMode === 'list'" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="tech in project.tech_stack.slice(0, 3)"
              :key="tech"
              class="rounded-md fill-tertiary px-2 py-0.5 text-caption-1"
            >
              {{ tech }}
            </span>
          </div>
          <div v-if="viewMode === 'list'" class="mt-2 flex gap-3">
            <a
              v-if="project.repo_url"
              :href="project.repo_url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-1 text-caption-1 text-system-blue"
              @click.stop
            >
              <PhGithubLogo :size="14" /> Repo
            </a>
            <a
              v-if="project.demo_url"
              :href="project.demo_url"
              target="_blank"
              rel="noopener"
              class="flex items-center gap-1 text-caption-1 text-system-blue"
              @click.stop
            >
              <PhGlobe :size="14" /> Demo
            </a>
          </div>
        </div>
      </button>

      <IOSEmptyState
        v-if="!projectsStore.projects.length"
        title="No projects yet"
        subtitle="Start tracking your DS/SE projects"
        :icon="PhFolder"
      >
        <IOSButton @click="showSheet = true">Start a Project</IOSButton>
      </IOSEmptyState>
    </div>

    <IOSSheet :open="showSheet" title="New Project" detent="large" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="title" label="Title" placeholder="Project name" clearable />
        <IOSTextArea v-model="description" label="Description" placeholder="What are you building?" />
        <IOSTextField v-model="techStack" label="Tech Stack" placeholder="Vue, Python (comma-separated)" />
        <IOSTextField v-model="repoUrl" label="Repository URL" placeholder="https://github.com/..." />
        <IOSButton block @click="createProject">Create Project</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
