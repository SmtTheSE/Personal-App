<script setup lang="ts">
import { format, isSameDay, isToday } from 'date-fns'
import { PhCaretLeft, PhCaretRight } from '@phosphor-icons/vue'

const props = defineProps<{
  days: Date[]
  selectedDay: Date
  weekLabel: string
  eventCount: (day: Date) => number
}>()

const emit = defineEmits<{
  select: [day: Date]
  prev: []
  next: []
  today: []
}>()
</script>

<template>
  <div class="px-4 pb-3">
    <div class="mb-3 flex items-center justify-between">
      <button type="button" class="flex min-h-[44px] min-w-[44px] items-center justify-center text-system-blue press-scale" aria-label="Previous week" @click="emit('prev')">
        <PhCaretLeft :size="20" weight="bold" />
      </button>
      <div class="text-center">
        <p class="text-headline text-primary">{{ weekLabel }}</p>
        <button type="button" class="text-caption-1 text-system-blue press-scale" @click="emit('today')">Today</button>
      </div>
      <button type="button" class="flex min-h-[44px] min-w-[44px] items-center justify-center text-system-blue press-scale" aria-label="Next week" @click="emit('next')">
        <PhCaretRight :size="20" weight="bold" />
      </button>
    </div>

    <div class="material-glass-pill flex justify-between gap-1 p-1.5" :style="{ borderRadius: '16px' }">
      <button
        v-for="day in days"
        :key="day.toISOString()"
        type="button"
        class="flex flex-1 flex-col items-center gap-1 rounded-xl py-2 press-scale"
        :class="isSameDay(day, selectedDay) ? 'bg-system-blue text-white shadow-sm' : 'text-secondary'"
        @click="emit('select', day)"
      >
        <span class="text-caption-2 font-medium uppercase" :class="isSameDay(day, selectedDay) ? 'text-white/80' : 'text-tertiary'">
          {{ format(day, 'EEE') }}
        </span>
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full text-subheadline font-semibold"
          :class="[
            isSameDay(day, selectedDay) ? 'bg-white/20' : '',
            isToday(day) && !isSameDay(day, selectedDay) ? 'ring-2 ring-system-blue ring-offset-1' : '',
          ]"
        >
          {{ format(day, 'd') }}
        </span>
        <span
          v-if="eventCount(day) > 0"
          class="h-1 w-1 rounded-full"
          :class="isSameDay(day, selectedDay) ? 'bg-white' : 'bg-system-blue'"
        />
        <span v-else class="h-1 w-1" />
      </button>
    </div>
  </div>
</template>
