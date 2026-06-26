<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useResourcesStore } from '@/stores/resources'
import { useNotesStore } from '@/stores/notes'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import IOSSearchBar from '@/components/ui/IOSSearchBar.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import IOSChip from '@/components/ui/IOSChip.vue'
import IOSContextMenu from '@/components/ui/IOSContextMenu.vue'
import IOSSkeleton from '@/components/ui/IOSSkeleton.vue'
import {
  PhPlus,
  PhStar,
  PhLink,
  PhBookmarkSimple,
  PhNotePencil,
  PhPushPin,
} from '@phosphor-icons/vue'
import type { ResourceType } from '@/types'

const router = useRouter()
const resourcesStore = useResourcesStore()
const notesStore = useNotesStore()
const { run } = useAsyncAction()

const segment = ref<'resources' | 'notes'>('resources')
const showResourceSheet = ref(false)
const showNoteSheet = ref(false)
const noteSearch = ref('')

const resTitle = ref('')
const resUrl = ref('')
const resType = ref<ResourceType>('article')
const resTags = ref('')

const noteTitle = ref('')
const noteContent = ref('')

const types: ResourceType[] = ['article', 'paper', 'tutorial', 'video', 'book', 'tool', 'other']

const typeIcons: Record<ResourceType, string> = {
  article: '📄',
  paper: '📑',
  tutorial: '📚',
  video: '🎬',
  book: '📖',
  tool: '🔧',
  other: '📌',
}

const filteredNotes = computed(() => {
  const q = noteSearch.value.trim().toLowerCase()
  if (!q) return notesStore.notes
  return notesStore.searchNotes(q)
})

function faviconUrl(link: string | null): string | null {
  if (!link) return null
  try {
    const host = new URL(link).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch {
    return null
  }
}

function openResourceUrl(link: string | null) {
  if (link) window.open(link, '_blank', 'noopener')
}

async function addResource() {
  if (!resTitle.value.trim()) return
  const result = await run(
    () =>
      resourcesStore.createResource({
        title: resTitle.value.trim(),
        url: resUrl.value || undefined,
        type: resType.value,
        tags: resTags.value ? resTags.value.split(',').map((t) => t.trim()).filter(Boolean) : [],
      }),
    { successMessage: 'Resource saved' }
  )
  if (!result) return
  resTitle.value = ''
  resUrl.value = ''
  resType.value = 'article'
  resTags.value = ''
  showResourceSheet.value = false
}

async function addNote() {
  if (!noteTitle.value.trim()) return
  const result = await run(
    () =>
      notesStore.createNote({
        title: noteTitle.value.trim(),
        content: noteContent.value || undefined,
      }),
    { successMessage: 'Note created' }
  )
  if (!result) return
  noteTitle.value = ''
  noteContent.value = ''
  showNoteSheet.value = false
  router.push(`/notes/${result.id}`)
}

async function handleRefresh() {
  await Promise.all([resourcesStore.fetchResources(), notesStore.fetchNotes()])
}
</script>

<template>
  <PageShell refreshable :on-refresh="handleRefresh">
    <template #header>
      <NavBar title="Library" large show-search>
        <div class="mx-4 mb-2 flex rounded-xl fill-tertiary p-1">
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-subheadline font-medium press-scale"
            :class="segment === 'resources' ? 'surface-elevated text-primary shadow-sm' : 'text-secondary'"
            @click="segment = 'resources'"
          >
            Resources
          </button>
          <button
            type="button"
            class="flex-1 rounded-lg py-2 text-subheadline font-medium press-scale"
            :class="segment === 'notes' ? 'surface-elevated text-primary shadow-sm' : 'text-secondary'"
            @click="segment = 'notes'"
          >
            Notes
          </button>
        </div>

        <IOSSearchBar
          v-if="segment === 'resources'"
          v-model="resourcesStore.searchQuery"
          placeholder="Search resources..."
        />
        <IOSSearchBar v-else v-model="noteSearch" placeholder="Search notes..." />

        <div v-if="segment === 'resources'" class="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide">
          <IOSChip label="All" :selected="!resourcesStore.activeTag" @click="resourcesStore.activeTag = null" />
          <IOSChip
            v-for="tag in resourcesStore.allTags"
            :key="tag"
            :label="tag"
            color="blue"
            :selected="resourcesStore.activeTag === tag"
            @click="resourcesStore.activeTag = tag"
          />
        </div>

        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-system-blue text-white press-scale"
            :aria-label="segment === 'resources' ? 'Save resource' : 'New note'"
            @click="segment === 'resources' ? (showResourceSheet = true) : (showNoteSheet = true)"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="py-4">
      <template v-if="segment === 'resources'">
        <IOSSkeleton v-if="resourcesStore.loading" class="px-4" />
        <IOSListGroup v-else-if="resourcesStore.filteredResources.length" :inset="false">
          <IOSContextMenu
            v-for="resource in resourcesStore.filteredResources"
            :key="resource.id"
            :items="[
              { id: 'fav', label: resource.is_favorite ? 'Unfavorite' : 'Favorite', onSelect: () => resourcesStore.toggleFavorite(resource.id) },
              { id: 'open', label: 'Open Link', onSelect: () => openResourceUrl(resource.url) },
              { id: 'del', label: 'Delete', destructive: true, onSelect: () => resourcesStore.deleteResource(resource.id) },
            ]"
          >
            <IOSListItem :title="resource.title" :subtitle="resource.type" @click="openResourceUrl(resource.url)">
              <template #icon>
                <img v-if="faviconUrl(resource.url)" :src="faviconUrl(resource.url)!" class="h-6 w-6 rounded" alt="" />
                <span v-else class="text-lg">{{ typeIcons[resource.type] }}</span>
              </template>
              <template #trailing>
                <div class="flex items-center gap-2">
                  <PhStar
                    :size="18"
                    :weight="resource.is_favorite ? 'fill' : 'regular'"
                    :class="resource.is_favorite ? 'text-system-orange' : 'text-tertiary'"
                  />
                  <PhLink v-if="resource.url" :size="16" class="text-tertiary" />
                </div>
              </template>
            </IOSListItem>
          </IOSContextMenu>
        </IOSListGroup>
        <IOSEmptyState v-else title="No resources saved" subtitle="Bookmark articles, papers, and tutorials" :icon="PhBookmarkSimple">
          <IOSButton @click="showResourceSheet = true">Save Resource</IOSButton>
        </IOSEmptyState>
      </template>

      <template v-else>
        <IOSSkeleton v-if="notesStore.loading" class="px-4" />
        <IOSListGroup v-else-if="filteredNotes.length" :inset="false">
          <IOSContextMenu
            v-for="note in filteredNotes"
            :key="note.id"
            :items="[
              { id: 'pin', label: note.is_pinned ? 'Unpin' : 'Pin', onSelect: () => notesStore.togglePin(note.id) },
              { id: 'del', label: 'Delete', destructive: true, onSelect: () => notesStore.deleteNote(note.id) },
            ]"
          >
            <IOSListItem
              :title="note.title"
              :subtitle="format(new Date(note.updated_at), 'MMM d, h:mm a')"
              @click="router.push(`/notes/${note.id}`)"
            >
              <template #icon>
                <PhNotePencil :size="22" class="text-system-purple" />
              </template>
              <template #trailing>
                <PhPushPin v-if="note.is_pinned" :size="16" class="text-system-orange" weight="fill" />
              </template>
            </IOSListItem>
          </IOSContextMenu>
        </IOSListGroup>
        <IOSEmptyState v-else title="No notes yet" subtitle="Capture ideas, lecture notes, and insights" :icon="PhNotePencil">
          <IOSButton @click="showNoteSheet = true">Create Note</IOSButton>
        </IOSEmptyState>
      </template>
    </div>

    <IOSSheet :open="showResourceSheet" title="Save Resource" @close="showResourceSheet = false">
      <div class="space-y-4 px-4 pb-6">
        <IOSTextField v-model="resTitle" label="Title" placeholder="Resource name" />
        <IOSTextField v-model="resUrl" label="URL" placeholder="https://..." />
        <div class="flex flex-wrap gap-2">
          <IOSChip v-for="t in types" :key="t" :label="t" :selected="resType === t" @click="resType = t" />
        </div>
        <IOSTextField v-model="resTags" label="Tags" placeholder="ml, python" />
        <IOSButton block @click="addResource">Save Resource</IOSButton>
      </div>
    </IOSSheet>

    <IOSSheet :open="showNoteSheet" title="New Note" @close="showNoteSheet = false">
      <div class="space-y-4 px-4 pb-6">
        <IOSTextField v-model="noteTitle" label="Title" placeholder="Note title" />
        <IOSTextArea v-model="noteContent" label="Content" placeholder="Start writing..." :rows="6" />
        <IOSButton block @click="addNote">Create Note</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
