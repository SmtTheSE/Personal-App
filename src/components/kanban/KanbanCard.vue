<script setup lang="ts">
import { format, parseISO } from 'date-fns'
import type { Task } from '@/types'
import type { KanbanColumn } from '@/types/kanban'
import { isGitHubSyncedTask } from '@/lib/kanban/columns'
import { PhGithubLogo } from '@phosphor-icons/vue'

defineProps<{
  task: Task
  column: KanbanColumn
}>()

const emit = defineEmits<{
  move: [column: KanbanColumn]
}>()

const priorityClass = {
  low: 'text-system-green',
  medium: 'text-system-orange',
  high: 'text-system-red',
}
</script>

<template>
  <article
    class="surface-elevated rounded-2xl p-3 shadow-sm"
    draggable="true"
    @dragstart="$event.dataTransfer?.setData('text/task-id', task.id)"
  >
    <div class="mb-2 flex items-start justify-between gap-2">
      <p class="text-subheadline text-primary">{{ task.title }}</p>
      <PhGithubLogo v-if="isGitHubSyncedTask(task)" :size="16" class="shrink-0 text-tertiary" weight="fill" />
    </div>
    <p v-if="task.description" class="text-caption-1 mb-2 line-clamp-2 text-tertiary">
      {{ task.description.split('\n')[0] }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-caption-2 font-medium uppercase" :class="priorityClass[task.priority]">
        {{ task.priority }}
      </span>
      <span v-if="task.due_date" class="text-caption-2 text-tertiary">
        Due {{ format(parseISO(task.due_date), 'MMM d') }}
      </span>
    </div>
    <div class="mt-3 flex flex-wrap gap-1">
      <button
        v-for="col in ['backlog', 'todo', 'in_progress', 'review', 'done']"
        :key="col"
        type="button"
        class="rounded-full px-2 py-0.5 text-caption-2 press-scale"
        :class="col === column ? 'bg-system-blue text-white' : 'fill-tertiary text-tertiary'"
        @click="emit('move', col as KanbanColumn)"
      >
        {{ col.replace('_', ' ') }}
      </button>
    </div>
  </article>
</template>
