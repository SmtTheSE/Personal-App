<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    max: number
    size?: number
    strokeWidth?: number
    color?: string
    label?: string
  }>(),
  { size: 120, strokeWidth: 10, color: 'var(--color-system-green)' }
)

const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const progress = computed(() => Math.min(1, props.max > 0 ? props.value / props.max : 0))
const offset = computed(() => circumference.value * (1 - progress.value))
const percent = computed(() => Math.round(progress.value * 100))
</script>

<template>
  <div class="relative inline-flex items-center justify-center" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" class="-rotate-90">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        class="stroke-[var(--color-fill-tertiary)]"
        :stroke-width="strokeWidth"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        :stroke="color"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
        class="transition-[stroke-dashoffset] duration-500"
        :style="{ transitionTimingFunction: 'var(--ease-ios)' }"
      />
    </svg>
    <div class="absolute text-center">
      <p class="text-title-2 font-bold text-primary">{{ percent }}%</p>
      <p v-if="label" class="text-caption-1 text-tertiary">{{ label }}</p>
    </div>
  </div>
</template>
