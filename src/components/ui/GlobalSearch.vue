<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { useTasksStore } from '@/stores/tasks'
import { useProjectsStore } from '@/stores/projects'
import { useResourcesStore } from '@/stores/resources'
import { useNotesStore } from '@/stores/notes'
import { useHaptics } from '@/composables/useHaptics'
import {
  PhCheckSquare,
  PhFolder,
  PhBookmarkSimple,
  PhNotePencil,
  PhX,
} from '@phosphor-icons/vue'

const ui = useUiStore()
const router = useRouter()
const tasksStore = useTasksStore()
const projectsStore = useProjectsStore()
const resourcesStore = useResourcesStore()
const notesStore = useNotesStore()
const { trigger } = useHaptics()

const query = ref('')

type SearchResult = {
  id: string
  type: 'task' | 'project' | 'resource' | 'note'
  title: string
  subtitle?: string
  path: string
}

const results = computed<SearchResult[]>(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []

  const items: SearchResult[] = []

  tasksStore.tasks
    .filter((t) => t.title.toLowerCase().includes(q))
    .slice(0, 5)
    .forEach((t) =>
      items.push({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: t.status,
        path: '/tasks',
      })
    )

  projectsStore.projects
    .filter((p) => p.title.toLowerCase().includes(q))
    .slice(0, 5)
    .forEach((p) =>
      items.push({
        id: p.id,
        type: 'project',
        title: p.title,
        subtitle: p.status,
        path: `/projects/${p.id}`,
      })
    )

  resourcesStore.resources
    .filter((r) => r.title.toLowerCase().includes(q) || r.tags.some((t) => t.toLowerCase().includes(q)))
    .slice(0, 5)
    .forEach((r) =>
      items.push({
        id: r.id,
        type: 'resource',
        title: r.title,
        subtitle: r.type,
        path: '/library',
      })
    )

  notesStore.searchNotes(q)
    .slice(0, 5)
    .forEach((n) =>
      items.push({
        id: n.id,
        type: 'note',
        title: n.title,
        subtitle: 'Note',
        path: `/notes/${n.id}`,
      })
    )

  return items
})

const typeIcons = {
  task: PhCheckSquare,
  project: PhFolder,
  resource: PhBookmarkSimple,
  note: PhNotePencil,
}

function close() {
  query.value = ''
  ui.closeGlobalSearch()
}

function navigate(result: SearchResult) {
  trigger('selection')
  close()
  router.push(result.path)
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    ui.openGlobalSearch()
  }
  if (e.key === 'Escape' && ui.globalSearchOpen) {
    close()
  }
}

watch(
  () => ui.globalSearchOpen,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => document.getElementById('global-search-input')?.focus(), 50)
    } else {
      document.body.style.overflow = ''
    }
  }
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="ui.globalSearchOpen"
        class="fixed inset-0 z-[100] flex flex-col bg-black/40 backdrop-blur-sm ios-safe-top ios-safe-bottom"
        @click.self="close"
      >
        <div class="mx-auto mt-16 w-full max-w-lg px-4">
          <div
            class="material-glass-elevated overflow-hidden shadow-2xl"
            :style="{ borderRadius: 'var(--radius-card)' }"
          >
            <div class="flex items-center gap-2 border-b border-[var(--color-separator)] px-3 py-2">
              <input
                id="global-search-input"
                v-model="query"
                type="search"
                placeholder="Search tasks, projects, notes..."
                class="flex-1 rounded-[10px] fill-tertiary py-2.5 px-3 text-subheadline text-primary outline-none placeholder:text-tertiary focus:ring-2 focus:ring-system-blue/30"
              />
              <button
                type="button"
                class="flex min-h-[44px] min-w-[44px] items-center justify-center text-tertiary press-scale"
                aria-label="Close search"
                @click="close"
              >
                <PhX :size="20" />
              </button>
            </div>

            <div class="max-h-[50vh] overflow-y-auto p-2">
              <p v-if="!query.trim()" class="px-3 py-6 text-center text-footnote text-tertiary">
                Type to search across your workspace
              </p>
              <button
                v-for="result in results"
                :key="`${result.type}-${result.id}`"
                type="button"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left press-scale hover:bg-[var(--color-fill-tertiary)]"
                @click="navigate(result)"
              >
                <component :is="typeIcons[result.type]" :size="20" class="shrink-0 text-system-blue" />
                <div class="min-w-0 flex-1">
                  <p class="text-body truncate text-primary">{{ result.title }}</p>
                  <p v-if="result.subtitle" class="text-caption-1 capitalize text-tertiary">{{ result.subtitle }}</p>
                </div>
              </button>
              <p v-if="query.trim() && !results.length" class="px-3 py-6 text-center text-footnote text-tertiary">
                No results for "{{ query }}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
