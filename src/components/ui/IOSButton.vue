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
</script>

<template>
  <button
    :type="type"
    class="inline-flex items-center justify-center font-semibold press-scale disabled:opacity-50 disabled:pointer-events-none"
    :class="[
      block ? 'w-full' : '',
      size === 'sm' ? 'h-9 px-3 text-subheadline rounded-lg' : '',
      size === 'md' ? `h-[${LAYOUT.minTouchTarget}px] px-5 text-body rounded-[10px]` : '',
      size === 'lg' ? 'h-[50px] px-6 text-body rounded-[12px]' : '',
      variant === 'filled' ? 'bg-system-blue text-white' : '',
      variant === 'borderedProminent' ? 'bg-system-blue/15 text-system-blue dark:bg-system-blue/25' : '',
      variant === 'bordered' ? 'border border-separator bg-transparent text-system-blue dark:border-separator-dark' : '',
      variant === 'plain' ? 'bg-transparent text-system-blue' : '',
      variant === 'destructive' ? 'bg-system-red/12 text-system-red' : '',
    ]"
    :style="size === 'md' ? { minHeight: `${LAYOUT.minTouchTarget}px` } : undefined"
    :disabled="disabled || loading"
  >
    <span
      v-if="loading"
      class="mr-2 h-4 w-4 animate-[spin-ios_0.8s_linear_infinite] rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
    <slot />
  </button>
</template>
