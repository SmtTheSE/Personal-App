<script setup lang="ts">
import type { ButtonVariant, ButtonSize } from './types'
import { LAYOUT } from '@/design/constants'

withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    loading?: boolean
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit' | 'reset'
  }>(),
  {
    variant: 'filled',
    size: 'md',
    loading: false,
    block: false,
    disabled: false,
    type: 'button',
  }
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<template>
  <button
    :type="type"
    class="inline-flex cursor-pointer items-center justify-center font-semibold press-scale disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      block ? 'w-full' : '',
      size === 'sm' ? 'h-9 px-3 text-subheadline rounded-lg' : '',
      size === 'md' ? 'px-5 text-body rounded-[10px]' : '',
      size === 'lg' ? 'h-[50px] px-6 text-body rounded-[12px]' : '',
      variant === 'filled' ? 'bg-[var(--color-system-blue)] text-white' : '',
      variant === 'borderedProminent' ? 'bg-[var(--color-system-blue)] text-white' : '',
      variant === 'bordered' ? 'border border-[var(--color-separator)] bg-transparent text-[var(--color-system-blue)]' : '',
      variant === 'plain' ? 'bg-transparent text-[var(--color-system-blue)]' : '',
      variant === 'destructive' ? 'bg-[var(--color-system-red)]/12 text-[var(--color-system-red)]' : '',
    ]"
    :style="size === 'md' ? { minHeight: `${LAYOUT.minTouchTarget}px` } : undefined"
    :disabled="disabled || loading"
    @click="emit('click', $event)"
  >
    <span
      v-if="loading"
      class="mr-2 h-4 w-4 animate-[spin-ios_0.8s_linear_infinite] rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
