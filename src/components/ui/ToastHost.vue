<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUiStore } from '@/stores/ui'
import { LAYOUT } from '@/design/constants'

const ui = useUiStore()
const { toasts } = storeToRefs(ui)

const bottomOffset = computed(
  () =>
    `calc(env(safe-area-inset-bottom, 0px) + ${LAYOUT.tabBarInset}px + ${LAYOUT.tabBarHeight}px + ${LAYOUT.fabMargin}px)`
)

async function handleAction(toastId: number) {
  const toast = toasts.value.find((t) => t.id === toastId)
  if (!toast?.action) return
  await toast.action.onAction()
  ui.dismissToast(toastId)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="toasts.length"
      class="pointer-events-none fixed inset-x-0 z-[90] flex flex-col-reverse items-center gap-2 px-4"
      :style="{ bottom: bottomOffset }"
    >
      <TransitionGroup name="toast" tag="div" class="relative flex w-full max-w-md flex-col-reverse gap-2">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          role="alert"
          class="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-subheadline font-medium shadow-xl backdrop-blur-md"
          :class="{
            'bg-[var(--color-system-green)] text-white': toast.type === 'success',
            'bg-[var(--color-system-red)] text-white': toast.type === 'error',
            'surface-elevated text-primary': toast.type === 'info',
          }"
        >
          <span class="min-w-0 flex-1" @click="ui.dismissToast(toast.id)">{{ toast.message }}</span>
          <button
            v-if="toast.action"
            type="button"
            class="shrink-0 rounded-lg px-2 py-1 text-body font-semibold underline press-scale"
            @click="handleAction(toast.id)"
          >
            {{ toast.action.label }}
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
