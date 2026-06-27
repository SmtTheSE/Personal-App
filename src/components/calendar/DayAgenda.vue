<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import { useRouter } from 'vue-router'
import type { CalendarEvent } from '@/composables/useCalendarWeek'
import { splitDayEvents, formatEventSubtitle } from '@/lib/calendar/eventUtils'
import IOSListGroup from '@/components/ui/IOSListGroup.vue'
import IOSListItem from '@/components/ui/IOSListItem.vue'
import IOSEmptyState from '@/components/ui/IOSEmptyState.vue'
import {
  PhCheckSquare,
  PhExam,
  PhTimer,
  PhBrain,
  PhCalendarBlank,
  PhGoogleLogo,
  PhMapPin,
  PhArrowSquareOut,
} from '@phosphor-icons/vue'

const props = defineProps<{
  events: CalendarEvent[]
  day: Date
  showGoogleBadge?: boolean
}>()

const router = useRouter()

const grouped = computed(() => splitDayEvents(props.events))

const icons = {
  task: PhCheckSquare,
  exam: PhExam,
  focus: PhTimer,
  review: PhBrain,
  google: PhGoogleLogo,
}

const typeLabels = {
  task: 'Task due',
  exam: 'Exam',
  focus: 'Focus',
  review: 'Review',
  google: 'Google Calendar',
}

function openEvent(event: CalendarEvent) {
  if (event.externalUrl) {
    window.open(event.externalUrl, '_blank', 'noopener,noreferrer')
    return
  }
  if (event.path) router.push(event.path)
}

function timeColumn(event: CalendarEvent) {
  if (event.allDay) return 'All day'
  return format(event.date, 'h:mm a')
}
</script>

<template>
  <section>
    <h2 class="text-title-3 mb-2 px-4 text-primary">{{ format(day, 'EEEE, MMM d') }}</h2>

    <div v-if="events.length" class="space-y-4">
      <div v-if="grouped.allDay.length">
        <p class="text-section-header mb-2 px-4">All day</p>
        <IOSListGroup :inset="false">
          <IOSListItem
            v-for="event in grouped.allDay"
            :key="event.id"
            :title="event.title"
            :subtitle="formatEventSubtitle(event) ?? typeLabels[event.type]"
            @click="openEvent(event)"
          >
            <template #icon>
              <div
                class="flex h-9 w-9 items-center justify-center rounded-xl"
                :style="{ backgroundColor: `color-mix(in srgb, ${event.color} 18%, transparent)` }"
              >
                <component :is="icons[event.type]" :size="18" :style="{ color: event.color }" weight="fill" />
              </div>
            </template>
            <template v-if="event.externalUrl" #trailing>
              <PhArrowSquareOut :size="16" class="text-tertiary" />
            </template>
          </IOSListItem>
        </IOSListGroup>
      </div>

      <div v-if="grouped.timed.length">
        <p v-if="grouped.allDay.length" class="text-section-header mb-2 px-4">Timed</p>
        <div class="space-y-2 px-4">
          <button
            v-for="event in grouped.timed"
            :key="event.id"
            type="button"
            class="surface-elevated flex w-full gap-3 p-3 text-left press-scale"
            :style="{ borderRadius: 'var(--radius-card)' }"
            @click="openEvent(event)"
          >
            <div class="w-16 shrink-0 pt-0.5">
              <p class="text-caption-1 font-medium text-system-blue">{{ timeColumn(event) }}</p>
              <p v-if="event.endDate" class="text-caption-2 text-tertiary">
                {{ format(event.endDate, 'h:mm a') }}
              </p>
            </div>
            <div class="min-w-0 flex-1 border-l border-[var(--color-separator)] pl-3">
              <div class="flex items-start justify-between gap-2">
                <p class="text-headline text-primary">{{ event.title }}</p>
                <PhArrowSquareOut v-if="event.externalUrl" :size="16" class="shrink-0 text-tertiary" />
              </div>
              <p class="text-footnote text-secondary">{{ typeLabels[event.type] }}</p>
              <p v-if="formatEventSubtitle(event)" class="text-caption-1 text-tertiary">
                {{ formatEventSubtitle(event) }}
              </p>
              <p v-if="event.location" class="mt-1 flex items-center gap-1 text-caption-2 text-tertiary">
                <PhMapPin :size="12" />
                {{ event.location }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <p
        v-if="showGoogleBadge && events.some((e) => e.type === 'google')"
        class="px-4 text-caption-2 text-tertiary"
      >
        Includes events from Google Calendar — no need to switch apps
      </p>
    </div>

    <IOSEmptyState
      v-else
      title="Nothing scheduled"
      subtitle="Tasks, exams, Google events, and reviews appear here"
      :icon="PhCalendarBlank"
    />
  </section>
</template>
