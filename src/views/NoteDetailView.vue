<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { format } from 'date-fns'
import { useNotesStore } from '@/stores/notes'
import { useProjectsStore } from '@/stores/projects'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSTextArea from '@/components/ui/IOSTextArea.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhPushPin } from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()
const notesStore = useNotesStore()
const projectsStore = useProjectsStore()
const { run } = useAsyncAction()

const noteId = computed(() => route.params.id as string)
const note = computed(() => notesStore.getNoteById(noteId.value))

const title = ref('')
const content = ref('')
const saving = ref(false)

onMounted(async () => {
  if (!notesStore.notes.length) await notesStore.fetchNotes()
  if (!projectsStore.projects.length) await projectsStore.fetchProjects()
  syncFromNote()
})

watch(note, syncFromNote)

function syncFromNote() {
  if (!note.value) return
  title.value = note.value.title
  content.value = note.value.content ?? ''
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null

function scheduleSave() {
  if (!note.value) return
  saving.value = true
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(async () => {
    try {
      await notesStore.updateNote(note.value!.id, {
        title: title.value.trim() || 'Untitled',
        content: content.value || null,
      })
    } catch {
      // autosave — ignore transient errors
    }
    saving.value = false
  }, 600)
}

async function togglePin() {
  if (!note.value) return
  await run(() => notesStore.togglePin(note.value!.id), { successMessage: 'Updated' })
}

async function deleteNote() {
  if (!note.value) return
  const id = note.value.id
  const result = await run(
    async () => {
      await notesStore.deleteNote(id)
      return true
    },
    { successMessage: 'Note deleted' }
  )
  if (result) router.push('/library')
}
</script>

<template>
  <PageShell v-if="note">
    <template #header>
      <NavBar :title="title || 'Note'" show-back>
        <div class="flex items-center justify-between px-4 pb-2">
          <span class="text-caption-1 text-tertiary">
            {{ saving ? 'Saving...' : `Updated ${format(new Date(note.updated_at), 'MMM d')}` }}
          </span>
          <button
            type="button"
            class="flex min-h-[44px] min-w-[44px] items-center justify-center press-scale"
            :class="note.is_pinned ? 'text-system-orange' : 'text-tertiary'"
            aria-label="Pin note"
            @click="togglePin"
          >
            <PhPushPin :size="20" :weight="note.is_pinned ? 'fill' : 'regular'" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="space-y-4 px-4 py-4">
      <IOSTextField v-model="title" label="Title" @update:model-value="scheduleSave" />
      <IOSTextArea
        v-model="content"
        label="Content"
        placeholder="Write in markdown-friendly plain text..."
        :rows="16"
        @update:model-value="scheduleSave"
      />
      <IOSButton variant="destructive" block @click="deleteNote">Delete Note</IOSButton>
    </div>
  </PageShell>

  <div v-else class="flex min-h-[50vh] items-center justify-center">
    <p class="text-subheadline text-tertiary">Loading note...</p>
  </div>
</template>
