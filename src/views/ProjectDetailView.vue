<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useAsyncAction } from '@/composables/useAsyncAction'
import { gradientFromString, initialsFromString } from '@/lib/color'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhGithubLogo, PhGlobe } from '@phosphor-icons/vue'
import type { ProjectStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const { run } = useAsyncAction()

const projectId = computed(() => route.params.id as string)
const project = computed(() => projectsStore.getProjectById(projectId.value))

onMounted(async () => {
  if (!project.value) await projectsStore.fetchProjects()
})

const statusOptions: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']

async function updateStatus(s: ProjectStatus) {
  if (!project.value) return
  await run(() => projectsStore.updateProject(project.value!.id, { status: s }), {
    successMessage: 'Status updated',
  })
}

async function deleteProject() {
  if (!project.value) return
  const id = project.value.id
  const result = await run(
    async () => {
      await projectsStore.deleteProject(id)
      return true
    },
    { successMessage: 'Project deleted' }
  )
  if (result) router.push('/projects')
}
</script>

<template>
  <PageShell v-if="project">
    <template #header>
      <NavBar :title="project.title" show-back />
    </template>

    <div class="space-y-6 px-4 py-4">
      <div
        class="surface-elevated flex h-32 items-center justify-center text-4xl font-bold text-white"
        :style="{ borderRadius: 'var(--radius-card)', background: gradientFromString(project.title) }"
      >
        {{ initialsFromString(project.title) }}
      </div>

      <div class="surface-elevated p-4" :style="{ borderRadius: 'var(--radius-card)' }">
        <p class="text-subheadline text-primary">{{ project.description || 'No description' }}</p>
        <div v-if="project.tech_stack.length" class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tech in project.tech_stack"
            :key="tech"
            class="rounded-lg bg-system-blue/10 px-3 py-1 text-footnote font-medium text-system-blue"
          >
            {{ tech }}
          </span>
        </div>
        <div class="mt-4 flex gap-4">
          <a
            v-if="project.repo_url"
            :href="project.repo_url"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 text-subheadline text-system-blue"
          >
            <PhGithubLogo :size="18" /> Repository
          </a>
          <a
            v-if="project.demo_url"
            :href="project.demo_url"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-2 text-subheadline text-system-blue"
          >
            <PhGlobe :size="18" /> Live Demo
          </a>
        </div>
      </div>

      <IOSListGroup title="Status">
        <IOSListItem
          v-for="s in statusOptions"
          :key="s"
          :title="s.charAt(0).toUpperCase() + s.slice(1)"
          @click="updateStatus(s)"
        >
          <template #trailing>
            <div
              v-if="project.status === s"
              class="flex h-5 w-5 items-center justify-center rounded-full bg-system-blue"
            >
              <div class="h-2 w-2 rounded-full bg-white" />
            </div>
          </template>
        </IOSListItem>
      </IOSListGroup>

      <IOSButton variant="destructive" block @click="deleteProject">Delete Project</IOSButton>
    </div>
  </PageShell>

  <div v-else class="flex min-h-[50vh] items-center justify-center">
    <p class="text-subheadline text-tertiary">Loading...</p>
  </div>
</template>
