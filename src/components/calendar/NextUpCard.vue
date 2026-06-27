<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import type { CalendarEvent } from '@/composables/useCalendarWeek'
import { nextUpLabel } from '@/lib/calendar/eventUtils'
import { PhClock, PhArrowRight } from '@phosphor-icons/vue'

const props = defineProps<{
  event: CalendarEvent | null
}>()

defineEmits<{
  open: []
}>()

const label = computed(() => (props.event ? nextUpLabel(props.event) : ''))
</script>

<template>
  <button
    v-if="event"
    type="button"
    class="surface-elevated mx-4 mb-4 flex w-[calc(100%-2rem)] items-center gap-3 p-4 text-left press-scale"
    :style="{ borderRadius: 'var(--radius-card)' }"
    @click="$emit('open')"
  >
    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-system-blue/15 text-system-blue">
      <PhClock :size="22" weight="fill" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-caption-1 text-system-blue">Up next · {{ label }}</p>
      <p class="text-headline truncate text-primary">{{ event.title }}</p>
      <p class="text-footnote text-tertiary">
        {{ format(event.date, 'h:mm a') }}
        <span v-if="event.location"> · {{ event.location }}</span>
      </p>
    </div>
    <PhArrowRight :size="18" class="shrink-0 text-tertiary" />
  </button>
</template>
