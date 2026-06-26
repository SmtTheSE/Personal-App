<script setup lang="ts">
import { computed } from 'vue'
import { format } from 'date-fns'
import type { Exam } from '@/types'
import { PhExam, PhMapPin } from '@phosphor-icons/vue'

const props = defineProps<{
  exam: Exam
  daysUntil: number
  prepProgress: number
}>()

const emit = defineEmits<{ open: [] }>()

const urgencyClass = computed(() => {
  if (props.daysUntil <= 1) return 'from-system-red/20 to-system-orange/10'
  if (props.daysUntil <= 7) return 'from-system-orange/20 to-system-yellow/10'
  return 'from-system-blue/20 to-system-purple/10'
})

const countdownLabel = computed(() => {
  if (props.daysUntil === 0) return 'Today'
  if (props.daysUntil === 1) return 'Tomorrow'
  if (props.daysUntil < 0) return 'Passed'
  return `${props.daysUntil} days`
})
</script>

<template>
  <button
    type="button"
    class="surface-elevated w-full overflow-hidden text-left press-scale"
    :style="{ borderRadius: 'var(--radius-card)' }"
    @click="emit('open')"
  >
    <div class="bg-gradient-to-br p-4" :class="urgencyClass">
      <div class="flex items-start gap-3">
        <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/60 text-system-blue dark:bg-black/20">
          <PhExam :size="26" weight="fill" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-caption-1 font-semibold uppercase tracking-wide text-system-orange">{{ countdownLabel }}</p>
          <h3 class="text-headline truncate text-primary">{{ exam.title }}</h3>
          <p v-if="exam.course" class="text-footnote text-secondary">{{ exam.course }}</p>
          <p class="text-caption-1 mt-1 text-tertiary">{{ format(new Date(exam.exam_at), 'EEE, MMM d · h:mm a') }}</p>
        </div>
        <div class="text-right">
          <p class="text-title-2 font-bold text-primary">{{ prepProgress }}%</p>
          <p class="text-caption-2 text-tertiary">prepped</p>
        </div>
      </div>
      <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div class="h-full rounded-full bg-system-blue transition-all" :style="{ width: `${prepProgress}%` }" />
      </div>
      <div v-if="exam.location" class="mt-2 flex items-center gap-1 text-caption-1 text-tertiary">
        <PhMapPin :size="12" />
        {{ exam.location }}
      </div>
    </div>
  </button>
</template>
