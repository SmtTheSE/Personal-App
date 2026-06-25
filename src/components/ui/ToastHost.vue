<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const { toasts } = storeToRefs(ui)
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col gap-2 p-4 ios-safe-top">
      <TransitionGroup name="fade">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          role="alert"
          class="pointer-events-auto mx-auto w-full max-w-md rounded-[12px] px-4 py-3 text-subheadline font-medium shadow-lg press-scale"
          :class="{
            'bg-[var(--color-system-green)] text-white': toast.type === 'success',
            'bg-[var(--color-system-red)] text-white': toast.type === 'error',
            'bg-[var(--color-secondary-grouped-bg)] text-primary dark:bg-[var(--color-secondary-grouped-bg-dark)]': toast.type === 'info',
          }"
          @click="ui.dismissToast(toast.id)"
        >
          {{ toast.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
