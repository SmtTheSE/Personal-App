<script setup lang="ts">
import type { ChipColor } from './types'

const props = withDefaults(
  defineProps<{
    label: string
    selected?: boolean
    color?: ChipColor
  }>(),
  { selected: false, color: 'neutral' }
)

defineEmits<{ click: [] }>()

const colorClasses: Record<ChipColor, { base: string; selected: string }> = {
  blue: { base: 'fill-tertiary text-primary', selected: 'bg-system-blue text-white' },
  green: { base: 'fill-tertiary text-primary', selected: 'bg-system-green text-white' },
  orange: { base: 'fill-tertiary text-primary', selected: 'bg-system-orange text-white' },
  red: { base: 'fill-tertiary text-primary', selected: 'bg-system-red text-white' },
  purple: { base: 'fill-tertiary text-primary', selected: 'bg-system-purple text-white' },
  neutral: { base: 'fill-tertiary text-primary', selected: 'bg-system-blue text-white' },
}
</script>

<template>
  <button
    type="button"
    class="shrink-0 rounded-full px-3 py-1.5 text-caption-1 font-medium capitalize transition-colors press-scale"
    :class="selected ? colorClasses[color].selected : colorClasses[color].base"
    :aria-pressed="selected"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>
