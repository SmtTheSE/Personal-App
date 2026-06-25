<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import NavBar from '@/components/layout/NavBar.vue'
import IOSCard from '@/components/ui/IOSCard.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhGithubLogo, PhGlobe, PhTrash } from '@phosphor-icons/vue'
import type { ProjectStatus } from '@/types'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const projectId = computed(() => route.params.id as string)
const project = computed(() => projectsStore.getProjectById(projectId.value))

onMounted(async () => {
  if (!project.value) {
    await projectsStore.fetchProjects()
  }
})

const statusOptions: ProjectStatus[] = ['active', 'paused', 'completed', 'archived']

async function updateStatus(status: ProjectStatus) {
  if (!project.value) return
  await projectsStore.updateProject(project.value.id, { status })
}

async function deleteProject() {
  if (!project.value) return
  await projectsStore.deleteProject(project.value.id)
  router.push('/projects')
}
</script>

<template>
  <div v-if="project">
    <NavBar :title="project.title" show-back />

    <div class="space-y-6 px-4 py-4">
      <IOSCard class="!p-4">
        <p v-if="project.description" class="ios-subhead text-black dark:text-white">{{ project.description }}</p>
        <p v-else class="ios-subhead text-ios-tertiary-label">No description</p>

        <div v-if="project.tech_stack.length" class="mt-4 flex flex-wrap gap-2">
          <span
            v-for="tech in project.tech_stack"
            :key="tech"
            class="rounded-lg bg-ios-blue/10 px-3 py-1 ios-footnote font-medium text-ios-blue"
          >
            {{ tech }}
          </span>
        </div>

        <div class="mt-4 flex gap-4">
          <a
            v-if="project.repo_url"
            :href="project.repo_url"
            target="_blank"
            class="flex items-center gap-2 ios-subhead text-ios-blue"
          >
            <PhGithubLogo :size="18" /> Repository
          </a>
          <a
            v-if="project.demo_url"
            :href="project.demo_url"
            target="_blank"
            class="flex items-center gap-2 ios-subhead text-ios-blue"
          >
            <PhGlobe :size="18" /> Live Demo
          </a>
        </div>
      </IOSCard>

      <section>
        <p class="ios-footnote mb-2 px-1 font-semibold uppercase tracking-wide text-ios-tertiary-label">Status</p>
        <IOSListGroup>
          <IOSListItem
            v-for="s in statusOptions"
            :key="s"
            :title="s.charAt(0).toUpperCase() + s.slice(1)"
            @click="updateStatus(s)"
          >
            <template #trailing>
              <div
                v-if="project.status === s"
                class="h-5 w-5 rounded-full bg-ios-blue flex items-center justify-center"
              >
                <div class="h-2 w-2 rounded-full bg-white" />
              </div>
            </template>
          </IOSListItem>
        </IOSListGroup>
      </section>

      <IOSButton variant="destructive" block @click="deleteProject">
        <PhTrash :size="18" class="mr-2" />
        Delete Project
      </IOSButton>
    </div>
  </div>

  <div v-else class="flex min-h-[50vh] items-center justify-center">
    <p class="ios-subhead text-ios-tertiary-label">Loading...</p>
  </div>
</template>
