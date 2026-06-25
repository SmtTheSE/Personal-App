<script setup lang="ts">
import { ref } from 'vue'
import { useSwipeGesture, type SwipeAction } from '@/composables/useSwipeGesture'

const props = defineProps<{
  actions: SwipeAction[]
}>()

const rowRef = ref<HTMLElement | null>(null)
const { leadingActions, trailingActions, rowStyle, triggerAction } = useSwipeGesture(rowRef, props.actions)
</script>

<template>
  <div class="relative isolate overflow-hidden" style="touch-action: pan-y">
    <!-- Action layers sit behind the sliding foreground -->
    <div
      v-if="leadingActions.length"
      class="absolute inset-y-0 left-0 z-0 flex"
      aria-hidden="true"
    >
      <button
        v-for="action in leadingActions"
        :key="action.id"
        type="button"
        tabindex="-1"
        class="flex w-[72px] items-center justify-center text-caption-1 font-semibold text-white"
        :style="{ background: action.background }"
        @click="triggerAction(action)"
      >
        {{ action.label }}
      </button>
    </div>

    <div
      v-if="trailingActions.length"
      class="absolute inset-y-0 right-0 z-0 flex flex-row-reverse"
      aria-hidden="true"
    >
      <button
        v-for="action in trailingActions"
        :key="action.id"
        type="button"
        tabindex="-1"
        class="flex w-[72px] items-center justify-center text-caption-1 font-semibold text-white"
        :style="{ background: action.background }"
        @click="triggerAction(action)"
      >
        {{ action.label }}
      </button>
    </div>

    <!-- Opaque foreground — must cover actions when offset is 0 -->
    <div
      ref="rowRef"
      class="relative z-10 w-full bg-[var(--color-secondary-grouped-bg)] dark:bg-[var(--color-tertiary-grouped-bg-dark)]"
      :style="rowStyle"
    >
      <slot />
    </div>
  </div>
</template>
