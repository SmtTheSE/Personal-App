<script setup lang="ts">
import { computed } from 'vue'
import { LAYOUT } from '@/design/constants'
import { PhPlus } from '@phosphor-icons/vue'

const emit = defineEmits<{ click: [] }>()

const style = computed(() => ({
  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${LAYOUT.tabBarInset}px + ${LAYOUT.tabBarHeight}px + ${LAYOUT.fabMargin}px)`,
  width: `${LAYOUT.fabSize}px`,
  height: `${LAYOUT.fabSize}px`,
}))
</script>

<template>
  <button
    type="button"
    class="fixed right-4 z-[45] flex items-center justify-center rounded-full bg-system-blue text-white shadow-[0_4px_20px_rgba(0,122,255,0.45)] press-scale"
    :style="style"
    aria-label="Quick capture"
    @click="emit('click')"
  >
    <PhPlus :size="24" weight="bold" />
  </button>
</template>
