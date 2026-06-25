<script setup lang="ts">
defineProps<{
  title?: string
  footer?: string
  inset?: boolean
}>()
</script>

<template>
  <section :class="inset !== false ? 'mx-4' : ''">
    <p v-if="title" class="text-section-header mb-2 px-4">{{ title }}</p>
    <div class="ios-inset-group divide-y divide-[var(--color-separator)] dark:divide-[var(--color-separator-dark)]">
      <slot />
    </div>
    <p v-if="footer" class="text-footnote text-tertiary mt-2 px-4">{{ footer }}</p>
  </section>
</template>
