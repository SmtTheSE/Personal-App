<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTasksStore } from '@/stores/tasks'
import { useAsyncAction } from '@/composables/useAsyncAction'
import PageShell from '@/components/layout/PageShell.vue'
import NavBar from '@/components/layout/NavBar.vue'
import KanbanColumn from '@/components/kanban/KanbanColumn.vue'
import IOSButton from '@/components/ui/IOSButton.vue'
import IOSSheet from '@/components/ui/IOSSheet.vue'
import IOSTextField from '@/components/ui/IOSTextField.vue'
import { KANBAN_COLUMNS } from '@/types/kanban'
import type { TaskPriority } from '@/types'
import { PhPlus } from '@phosphor-icons/vue'

const router = useRouter()
const tasksStore = useTasksStore()
const { run } = useAsyncAction()

const showSheet = ref(false)
const newTitle = ref('')
const newPriority = ref<TaskPriority>('medium')

const board = computed(() => tasksStore.kanbanBoard)

async function moveTask(taskId: string, column: typeof KANBAN_COLUMNS[number]['id']) {
  await run(() => tasksStore.moveToKanbanColumn(taskId, column), { successMessage: 'Card moved' })
}

async function addTask() {
  if (!newTitle.value.trim()) return
  await run(
    () =>
      tasksStore.createTask({
        title: newTitle.value.trim(),
        priority: newPriority.value,
      }),
    { successMessage: 'Card added to Ready' }
  )
  newTitle.value = ''
  showSheet.value = false
}
</script>

<template>
  <PageShell>
    <template #header>
      <NavBar title="Dev Kanban" large show-back>
        <div class="flex justify-end px-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-system-blue)] text-white press-scale"
            aria-label="Add card"
            @click="showSheet = true"
          >
            <PhPlus :size="20" weight="bold" />
          </button>
        </div>
      </NavBar>
    </template>

    <div class="flex gap-4 overflow-x-auto px-4 pb-6 pt-2">
      <KanbanColumn
        v-for="column in KANBAN_COLUMNS"
        :key="column.id"
        :column="column"
        :tasks="board[column.id]"
        @move="moveTask"
      />
    </div>

    <div class="px-4 pb-6">
      <IOSButton block variant="bordered" @click="router.push('/weekly-plan')">
        View weekly plan
      </IOSButton>
    </div>

    <IOSSheet :open="showSheet" title="New card" @close="showSheet = false">
      <div class="space-y-4 p-4">
        <IOSTextField v-model="newTitle" label="Title" placeholder="Feature, bug, or chore" />
        <IOSButton block @click="addTask">Add to Ready</IOSButton>
      </div>
    </IOSSheet>
  </PageShell>
</template>
