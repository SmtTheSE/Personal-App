<script setup lang="ts">
import { ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useTasksStore } from '@/stores/tasks'
import { useResourcesStore } from '@/stores/resources'
import { useNotesStore } from '@/stores/notes'
import { useAsyncAction } from '@/composables/useAsyncAction'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import { PhCheckSquare, PhBookmarkSimple, PhNotePencil } from '@phosphor-icons/vue'

const ui = useUiStore()
const tasksStore = useTasksStore()
const resourcesStore = useResourcesStore()
const notesStore = useNotesStore()
const { run } = useAsyncAction()

type CaptureType = 'task' | 'resource' | 'note'
const captureType = ref<CaptureType>('task')
const title = ref('')
const url = ref('')

const types: { id: CaptureType; label: string; icon: typeof PhCheckSquare }[] = [
  { id: 'task', label: 'Task', icon: PhCheckSquare },
  { id: 'resource', label: 'Link', icon: PhBookmarkSimple },
  { id: 'note', label: 'Note', icon: PhNotePencil },
]

async function save() {
  if (!title.value.trim()) return

  let success = false
  if (captureType.value === 'task') {
    const result = await run(() => tasksStore.createTask({ title: title.value.trim() }), {
      successMessage: 'Task created',
    })
    success = !!result
  } else if (captureType.value === 'resource') {
    const result = await run(
      () =>
        resourcesStore.createResource({
          title: title.value.trim(),
          url: url.value || undefined,
        }),
      { successMessage: 'Resource saved' }
    )
    success = !!result
  } else {
    const result = await run(() => notesStore.createNote({ title: title.value.trim() }), {
      successMessage: 'Note created',
    })
    success = !!result
  }

  if (success) {
    title.value = ''
    url.value = ''
    ui.closeQuickCapture()
  }
}

function onClose() {
  title.value = ''
  url.value = ''
  ui.closeQuickCapture()
}
</script>

<template>
  <IOSSheet :open="ui.quickCaptureOpen" title="Quick Capture" @close="onClose">
    <div class="space-y-4 px-4 pb-6">
      <div class="flex gap-2">
        <button
          v-for="t in types"
          :key="t.id"
          type="button"
          class="flex flex-1 flex-col items-center gap-1 rounded-xl py-3 press-scale"
          :class="captureType === t.id ? 'bg-system-blue/15 text-system-blue' : 'fill-tertiary text-secondary'"
          @click="captureType = t.id"
        >
          <component :is="t.icon" :size="22" :weight="captureType === t.id ? 'fill' : 'regular'" />
          <span class="text-caption-1 font-medium">{{ t.label }}</span>
        </button>
      </div>

      <IOSTextField v-model="title" :label="captureType === 'note' ? 'Note title' : 'Title'" autofocus />
      <IOSTextField
        v-if="captureType === 'resource'"
        v-model="url"
        label="URL (optional)"
        type="url"
        placeholder="https://"
      />

      <IOSButton block @click="save">Save</IOSButton>
    </div>
  </IOSSheet>
</template>
