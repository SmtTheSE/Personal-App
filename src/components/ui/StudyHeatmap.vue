<script setup lang="ts">
import { computed } from 'vue'
import { subDays, format, eachDayOfInterval } from 'date-fns'

const props = defineProps<{
  data: Map<string, number>
  weeks?: number
}>()

const cells = computed(() => {
  const end = new Date()
  const start = subDays(end, (props.weeks ?? 12) * 7 - 1)
  const days = eachDayOfInterval({ start, end })

  return days.map((day) => {
    const key = format(day, 'yyyy-MM-dd')
    const minutes = props.data.get(key) ?? 0
    return { key, minutes, level: intensity(minutes) }
  })
})

function intensity(minutes: number): number {
  if (minutes === 0) return 0
  if (minutes < 30) return 1
  if (minutes < 60) return 2
  if (minutes < 120) return 3
  return 4
}

const levelColors = [
  'var(--color-fill-tertiary)',
  'rgba(0, 122, 255, 0.25)',
  'rgba(0, 122, 255, 0.45)',
  'rgba(0, 122, 255, 0.7)',
  'var(--color-system-blue)',
]
</script>

<template>
  <div class="flex flex-wrap gap-1" role="img" aria-label="Study activity heatmap">
    <div
      v-for="cell in cells"
      :key="cell.key"
      class="h-3 w-3 rounded-sm"
      :style="{ background: levelColors[cell.level] }"
      :title="`${cell.key}: ${cell.minutes} min`"
    />
  </div>
</template>
