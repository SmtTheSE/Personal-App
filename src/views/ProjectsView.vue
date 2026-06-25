<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import NavBar from '@/components/layout/NavBar.vue'
import IOSCard from '@/components/ui/IOSCard.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import { PhPlus, PhFolder, PhGithubLogo, PhGlobe } from '@phosphor-icons/vue'
import type { ProjectStatus } from '@/types'

const projectsStore = useProjectsStore()
const router = useRouter()

const showSheet = ref(false)
const title = ref('')
const description = ref('')
const techStack = ref('')
const repoUrl = ref('')
const status = ref<ProjectStatus>('active')

const statusColors: Record<ProjectStatus, string> = {
  active: 'bg-ios-green/15 text-ios-green',
  paused: 'bg-ios-orange/15 text-ios-orange',
  completed: 'bg-ios-blue/15 text-ios-blue',
  archived: 'bg-black/10 text-ios-tertiary-label',
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
  <div>
    <NavBar title="Projects" large>
      <div class="flex justify-end px-4 pb-2">
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-ios-blue text-white" @click="showSheet = true">
          <PhPlus :size="20" weight="bold" />
        </button>
      </div>
    </NavBar>

    <div class="space-y-4 px-4 py-4">
      <IOSCard
        v-for="project in projectsStore.projects"
        :key="project.id"
        class="!p-4 cursor-pointer active:scale-[0.99] transition-transform"
        @click="router.push(`/projects/${project.id}`)"
      >
        <div class="flex items-start gap-3">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] bg-ios-blue/10">
            <PhFolder :size="24" class="text-ios-blue" weight="fill" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <h3 class="ios-headline truncate text-black dark:text-white">{{ project.title }}</h3>
              <span class="shrink-0 rounded-full px-2 py-0.5 ios-caption font-medium capitalize" :class="statusColors[project.status]">
                {{ project.status }}
              </span>
            </div>
            <p v-if="project.description" class="ios-footnote mt-1 line-clamp-2 text-ios-tertiary-label">
              {{ project.description }}
            </p>
            <div v-if="project.tech_stack.length" class="mt-2 flex flex-wrap gap-1">
              <span
                v-for="tech in project.tech_stack"
                :key="tech"
                class="rounded-md bg-black/5 px-2 py-0.5 ios-caption dark:bg-white/10"
              >
                {{ tech }}
              </span>
            </div>
            <div class="mt-2 flex gap-3">
              <a
                v-if="project.repo_url"
                :href="project.repo_url"
                target="_blank"
                class="flex items-center gap-1 ios-caption text-ios-blue"
                @click.stop
              >
                <PhGithubLogo :size="14" /> Repo
              </a>
              <a
                v-if="project.demo_url"
                :href="project.demo_url"
                target="_blank"
                class="flex items-center gap-1 ios-caption text-ios-blue"
                @click.stop
              >
                <PhGlobe :size="14" /> Demo
              </a>
            </div>
          </div>
        </div>
      </IOSCard>

      <div v-if="!projectsStore.projects.length" class="py-16 text-center">
        <p class="ios-subhead text-ios-tertiary-label">No projects yet</p>
        <IOSButton class="mt-4" @click="showSheet = true">Start a project</IOSButton>
      </div>
    </div>

    <IOSSheet :open="showSheet" title="New Project" @close="showSheet = false">
      <div class="space-y-4">
        <IOSTextField v-model="title" label="Title" placeholder="Project name" />
        <IOSTextArea v-model="description" label="Description" placeholder="What are you building?" />
        <IOSTextField v-model="techStack" label="Tech Stack" placeholder="Vue, Python, TensorFlow (comma-separated)" />
        <IOSTextField v-model="repoUrl" label="Repository URL" placeholder="https://github.com/..." />
        <IOSButton block @click="createProject">Create Project</IOSButton>
      </div>
    </IOSSheet>
  </div>
</template>
