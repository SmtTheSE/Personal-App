<script setup lang="ts">
import { format } from 'date-fns'
import { useRouter } from 'vue-router'
import type { CalendarEvent } from '@/composables/useCalendarWeek'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import {
  PhCheckSquare,
  PhExam,
  PhTimer,
  PhBrain,
  PhCalendarBlank,
} from '@phosphor-icons/vue'

defineProps<{
  events: CalendarEvent[]
  day: Date
}>()

const router = useRouter()

const icons = {
  task: PhCheckSquare,
  exam: PhExam,
  focus: PhTimer,
  review: PhBrain,
}

const typeLabels = {
  task: 'Task',
  exam: 'Exam',
  focus: 'Focus',
  review: 'Review',
}
</script>

<template>
  <section>
    <h2 class="text-title-3 mb-2 px-4 text-primary">{{ format(day, 'EEEE, MMM d') }}</h2>

    <IOSListGroup v-if="events.length" :inset="false">
      <IOSListItem
        v-for="event in events"
        :key="event.id"
        :title="event.title"
        :subtitle="event.subtitle ?? typeLabels[event.type]"
        @click="event.path && router.push(event.path)"
      >
        <template #icon>
          <div
            class="flex h-9 w-9 items-center justify-center rounded-xl"
            :style="{ backgroundColor: `color-mix(in srgb, ${event.color} 18%, transparent)` }"
          >
            <component :is="icons[event.type]" :size="18" :style="{ color: event.color }" weight="fill" />
          </div>
        </template>
      </IOSListItem>
    </IOSListGroup>

    <IOSEmptyState
      v-else
      title="Nothing scheduled"
      subtitle="Tasks, exams, and reviews appear here"
      :icon="PhCalendarBlank"
    />
  </section>
</template>
