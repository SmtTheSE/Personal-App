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
  <div class="relative overflow-hidden" style="touch-action: pan-y">
    <!-- Leading actions -->
    <div
      v-if="leadingActions.length"
      class="absolute inset-y-0 left-0 flex"
    >
      <button
        v-for="action in leadingActions"
        :key="action.id"
        type="button"
        class="flex min-w-[72px] items-center justify-center px-4 text-caption-1 font-semibold text-white press-scale"
        :style="{ background: action.background }"
        @click="triggerAction(action)"
      >
        {{ action.label }}
      </button>
    </div>

    <!-- Trailing actions -->
    <div
      v-if="trailingActions.length"
      class="absolute inset-y-0 right-0 flex"
    >
      <button
        v-for="action in trailingActions"
        :key="action.id"
        type="button"
        class="flex min-w-[72px] items-center justify-center px-4 text-caption-1 font-semibold text-white press-scale"
        :style="{ background: action.background }"
        @click="triggerAction(action)"
      >
        {{ action.label }}
      </button>
    </div>

    <!-- Row content -->
    <div
      ref="rowRef"
      class="relative bg-inherit"
      :style="rowStyle"
    >
      <slot />
    </div>
  </div>
</template>
