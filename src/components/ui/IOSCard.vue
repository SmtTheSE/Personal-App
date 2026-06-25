<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    variant?: 'elevated' | 'glass' | 'widget'
    padding?: boolean
    accent?: string
  }>(),
  { variant: 'elevated', padding: true }
)
</script>

<template>
  <div
    class="overflow-hidden"
    :class="{
      'surface-elevated': variant === 'elevated' || variant === 'widget',
      'material-glass': variant === 'glass',
    }"
    :style="{ borderRadius: 'var(--radius-card)' }"
  >
    <div
      v-if="accent"
      class="h-1 w-full"
      :style="{ background: accent }"
    />
    <div v-if="title || subtitle" :class="padding ? 'mb-3 px-4 pt-4' : ''">
      <h3 v-if="title" class="text-headline text-primary">{{ title }}</h3>
      <p v-if="subtitle" class="text-footnote mt-0.5 text-tertiary">{{ subtitle }}</p>
    </div>
    <div :class="padding ? 'p-4' : ''">
      <slot />
    </div>
  </div>
</template>
