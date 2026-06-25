<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  padding?: boolean
}>()
</script>

<template>
  <div class="ios-card p-4" :class="{ 'p-0': padding === false }">
    <div v-if="title || subtitle" class="mb-3 px-4 pt-4" :class="{ 'px-0 pt-0': padding === false }">
      <h3 v-if="title" class="ios-headline text-black dark:text-white">{{ title }}</h3>
      <p v-if="subtitle" class="ios-footnote mt-0.5 text-ios-tertiary-label">{{ subtitle }}</p>
    </div>
    <slot />
  </div>
</template>
