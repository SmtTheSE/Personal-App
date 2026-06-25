<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon?: Component
  iconColor?: string
  label: string
  value: string | number
  subtitle?: string
  size?: 'small' | 'medium'
  accent?: string
}>()
</script>

<template>
  <div
    class="surface-elevated flex flex-col"
    :class="size === 'medium' ? 'col-span-2 p-4' : 'p-4'"
    :style="{ borderRadius: 'var(--radius-card)' }"
  >
    <div v-if="accent" class="-mx-4 -mt-4 mb-3 h-1" :style="{ background: accent }" />
    <div class="flex items-center gap-2" :class="iconColor">
      <component :is="icon" v-if="icon" :size="22" weight="fill" />
      <span class="text-footnote font-semibold uppercase tracking-wide text-tertiary">{{ label }}</span>
    </div>
    <p class="mt-2 text-[32px] font-bold leading-none text-primary">{{ value }}</p>
    <p v-if="subtitle" class="text-caption-1 mt-1 text-tertiary">{{ subtitle }}</p>
    <slot />
  </div>
</template>
