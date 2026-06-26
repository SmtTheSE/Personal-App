<script setup lang="ts">
import { format, isToday, isTomorrow } from 'date-fns'
import type { Task } from '@/types'
import { PhCalendar, PhWarning } from '@phosphor-icons/vue'

const props = defineProps<{
  tasks: (Task & { due?: Date })[]
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

function dueLabel(due: Date) {
  if (isToday(due)) return 'Today'
  if (isTomorrow(due)) return 'Tomorrow'
  return format(due, 'MMM d')
}

const isOverdue = (due: Date) => due < new Date() && !isToday(due)
</script>

<template>
  <div v-if="tasks.length" class="-mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
    <button
      v-for="task in tasks"
      :key="task.id"
      type="button"
      class="surface-elevated flex min-w-[140px] shrink-0 flex-col gap-1 p-3 text-left press-scale"
      :style="{ borderRadius: 'var(--radius-card)' }"
      @click="emit('select', task.id)"
    >
      <div class="flex items-center gap-1">
        <PhWarning v-if="task.due && isOverdue(task.due)" :size="14" class="text-system-red" weight="fill" />
        <PhCalendar v-else :size="14" class="text-system-blue" />
        <span
          class="text-caption-2 font-medium"
          :class="task.due && isOverdue(task.due) ? 'text-system-red' : 'text-system-blue'"
        >
          {{ task.due ? dueLabel(task.due) : 'Soon' }}
        </span>
      </div>
      <span class="text-footnote line-clamp-2 text-primary">{{ task.title }}</span>
    </button>
  </div>
</template>
