<script setup lang="ts">
defineProps<{
  inset?: boolean
}>()
</script>

<template>
  <div
    class="ios-inset-group divide-y divide-ios-separator dark:divide-ios-separator-dark"
    :class="inset ? 'mx-4' : ''"
  >
    <slot />
  </div>
</template>
