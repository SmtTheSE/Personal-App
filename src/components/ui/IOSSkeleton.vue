<script setup lang="ts">
defineProps<{
  rows?: number
  height?: string
}>()
</script>

<template>
  <div class="animate-pulse space-y-3">
    <div
      v-for="i in (rows ?? 3)"
      :key="i"
      class="rounded-xl bg-[var(--color-fill-tertiary)]"
      :style="{ height: height ?? '56px' }"
    />
  </div>
</template>
