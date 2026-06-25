<script setup lang="ts">
defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/40"
        @click="emit('close')"
      />
    </Transition>
    <Transition name="sheet">
      <div
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-hidden rounded-t-[16px] bg-ios-grouped dark:bg-ios-grouped-dark ios-safe-bottom"
      >
        <div class="flex justify-center pt-2 pb-1">
          <div class="h-1 w-9 rounded-full bg-black/20 dark:bg-white/30" />
        </div>
        <div class="flex items-center justify-between border-b border-ios-separator px-4 pb-3 dark:border-ios-separator-dark">
          <button type="button" class="text-ios-blue ios-subhead" @click="emit('close')">Cancel</button>
          <h2 v-if="title" class="ios-headline">{{ title }}</h2>
          <div class="w-14" />
        </div>
        <div class="overflow-y-auto px-4 py-4" style="max-height: calc(90vh - 80px)">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
