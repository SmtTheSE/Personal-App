<script setup lang="ts">
import type { Task } from '@/types'
import type { KanbanColumn, KanbanColumnDef } from '@/types/kanban'
import KanbanCard from '@/components/kanban/KanbanCard.vue'

defineProps<{
  column: KanbanColumnDef
  tasks: Task[]
}>()

const emit = defineEmits<{
  move: [taskId: string, column: KanbanColumn]
}>()

function onDrop(event: DragEvent, column: KanbanColumn) {
  event.preventDefault()
  const taskId = event.dataTransfer?.getData('text/task-id')
  if (taskId) emit('move', taskId, column)
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
}
</script>

<template>
  <section
    class="flex h-full min-w-[280px] max-w-[320px] flex-col rounded-3xl bg-[var(--color-fill-tertiary)]/60 p-3"
    @dragover="onDragOver"
    @drop="onDrop($event, column.id)"
  >
    <header class="mb-3 px-1">
      <div class="flex items-center justify-between">
        <h3 class="text-headline text-primary">{{ column.title }}</h3>
        <span class="text-caption-1 text-tertiary">{{ tasks.length }}</span>
      </div>
      <p class="text-caption-1 text-tertiary">{{ column.subtitle }}</p>
    </header>

    <div class="flex flex-1 flex-col gap-2 overflow-y-auto">
      <KanbanCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :column="column.id"
        @move="emit('move', task.id, $event)"
      />
      <p v-if="!tasks.length" class="px-2 py-6 text-center text-caption-1 text-tertiary">
        Drop tasks here
      </p>
    </div>
  </section>
</template>
