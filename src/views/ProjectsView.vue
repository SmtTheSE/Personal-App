<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useIntegrationsStore } from '@/stores/integrations'
import { useAuthStore } from '@/stores/auth'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { gradientFromString, initialsFromString } from '@/lib/color'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSSkeleton from '@/components/ui/IOSSkeleton.vue'
import { PhPlus, PhGithubLogo, PhGlobe, PhFolder, PhSquaresFour, PhList, PhDownloadSimple, PhArrowSquareOut, PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'
import type { ProjectStatus } from '@/types'
import type { GitHubRepo } from '@/types/integrations'

const projectsStore = useProjectsStore()
const integrations = useIntegrationsStore()
const auth = useAuthStore()
const router = useRouter()
const { run } = useAsyncAction()

const showSheet = ref(false)
const showImportSheet = ref(false)
const repoSearch = ref('')
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
  const project = await run(
    () =>
      projectsStore.createProject({
        title: title.value.trim(),
        description: description.value || undefined,
        tech_stack: techStack.value ? techStack.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
        repo_url: repoUrl.value || undefined,
        status: status.value,
      }),
    { successMessage: 'Project created' }
  )
  if (!project) return
  title.value = ''
  description.value = ''
  techStack.value = ''
  repoUrl.value = ''
  showSheet.value = false
  router.push(`/projects/${project.id}`)
}

async function openImportSheet() {
  showImportSheet.value = true
  repoSearch.value = ''
  await integrations.fetchStatuses()
  if (!integrations.githubConnected) return
  await run(() => integrations.fetchGitHubRepos(1))
}

const filteredRepos = computed(() => {
  const q = repoSearch.value.trim().toLowerCase()
  if (!q) return integrations.githubRepos
  return integrations.githubRepos.filter(
    (repo) =>
      repo.full_name.toLowerCase().includes(q) ||
      (repo.description?.toLowerCase().includes(q) ?? false) ||
      (repo.language?.toLowerCase().includes(q) ?? false)
  )
})

const repoPageRange = computed(() => {
  const start = (integrations.githubReposPage - 1) * integrations.githubReposPerPage + 1
  const end = start + integrations.githubRepos.length - 1
  return { start: integrations.githubRepos.length ? start : 0, end }
})

async function goPrevRepoPage() {
  await run(() => integrations.prevGitHubReposPage())
}

async function goNextRepoPage() {
  await run(() => integrations.nextGitHubReposPage())
}

function selectRepo(repo: GitHubRepo) {
  title.value = repo.name
  description.value = repo.description ?? ''
  techStack.value = repo.language ?? ''
  repoUrl.value = repo.html_url
  showImportSheet.value = false
  showSheet.value = true
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
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full fill-tertiary text-system-blue press-scale"
              aria-label="Import from GitHub"
              @click="openImportSheet"
            >
              <PhDownloadSimple :size="20" />
            </button>
            <button
              type="button"
              class="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-system-blue)] text-white press-scale"
              aria-label="Add project"
              @click="showSheet = true"
            >
              <PhPlus :size="20" weight="bold" />
            </button>
          </div>
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
        <IOSButton type="button" block variant="filled" @click="createProject">Create Project</IOSButton>
      </div>
    </IOSSheet>

    <IOSSheet :open="showImportSheet" title="Import from GitHub" detent="large" @close="showImportSheet = false">
      <div v-if="!integrations.githubConnected" class="space-y-4 text-center">
        <PhGithubLogo :size="40" class="mx-auto text-primary" weight="fill" />
        <p class="text-footnote text-tertiary">
          Connect GitHub in Settings (with repo access) to import repositories.
        </p>
        <IOSButton block @click="auth.signInWithGitHub()">Connect GitHub</IOSButton>
        <IOSButton block variant="bordered" @click="router.push('/settings')">Open Settings</IOSButton>
      </div>
      <div v-else class="space-y-3">
        <IOSTextField
          v-model="repoSearch"
          label="Search"
          placeholder="Filter repos on this page"
          clearable
        />
        <p class="text-caption-1 text-tertiary">
          Page {{ integrations.githubReposPage }}
          <span v-if="repoPageRange.start">
            · repos {{ repoPageRange.start }}–{{ repoPageRange.end }}
          </span>
        </p>
        <IOSSkeleton v-if="integrations.loading" />
        <div v-else-if="!filteredRepos.length" class="py-8 text-center text-footnote text-tertiary">
          No repositories on this page match your search.
        </div>
        <IOSListGroup v-else :inset="false">
          <div
            v-for="repo in filteredRepos"
            :key="repo.id"
            class="flex items-center gap-3 border-b border-[var(--color-separator)] px-4 py-3 last:border-b-0"
          >
            <PhGithubLogo :size="22" class="shrink-0 text-primary" weight="fill" />
            <div class="min-w-0 flex-1">
              <a
                :href="repo.html_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-headline text-system-blue hover:underline"
              >
                {{ repo.full_name }}
              </a>
              <p class="text-footnote mt-0.5 line-clamp-2 text-tertiary">
                {{ repo.description ?? repo.language ?? 'Repository' }}
                <span v-if="repo.private" class="text-caption-2"> · private</span>
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <a
                :href="repo.html_url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex h-9 w-9 items-center justify-center rounded-full fill-tertiary text-system-blue press-scale"
                aria-label="Open on GitHub"
              >
                <PhArrowSquareOut :size="18" />
              </a>
              <IOSButton size="sm" variant="bordered" @click="selectRepo(repo)">
                Import
              </IOSButton>
            </div>
          </div>
        </IOSListGroup>
        <div class="flex items-center justify-between gap-2 pt-1">
          <IOSButton
            size="sm"
            variant="bordered"
            :disabled="integrations.githubReposPage <= 1 || integrations.loading"
            @click="goPrevRepoPage"
          >
            <PhCaretLeft :size="16" class="mr-1 inline" />
            Previous
          </IOSButton>
          <span class="text-caption-1 text-tertiary">Page {{ integrations.githubReposPage }}</span>
          <IOSButton
            size="sm"
            variant="bordered"
            :disabled="!integrations.githubReposHasMore || integrations.loading"
            @click="goNextRepoPage"
          >
            Next
            <PhCaretRight :size="16" class="ml-1 inline" />
          </IOSButton>
        </div>
      </div>
    </IOSSheet>
  </PageShell>
</template>
