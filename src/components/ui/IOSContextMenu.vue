<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface ContextMenuItem {
  id: string
  label: string
  destructive?: boolean
  onSelect: () => void
}

const props = defineProps<{
  items: ContextMenuItem[]
}>()

const open = ref(false)
const position = ref({ x: 0, y: 0 })
let longPressTimer: ReturnType<typeof setTimeout> | null = null

function close() {
  open.value = false
}

function onPointerDown(e: PointerEvent) {
  longPressTimer = setTimeout(() => {
    position.value = { x: e.clientX, y: e.clientY }
    open.value = true
  }, 500)
}

function onPointerUp() {
  if (longPressTimer) clearTimeout(longPressTimer)
}

function selectItem(item: ContextMenuItem) {
  item.onSelect()
  close()
}

onMounted(() => {
  document.addEventListener('click', close)
})

onUnmounted(() => {
  document.removeEventListener('click', close)
  if (longPressTimer) clearTimeout(longPressTimer)
})
</script>

<template>
  <div
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @contextmenu.prevent
  >
    <slot />
  </div>

  <Teleport to="body">
    <Transition name="fade">
      <div v-if="open" class="fixed inset-0 z-[60]" @click="close" />
    </Transition>
    <Transition name="fade">
      <div
        v-if="open"
        role="menu"
        class="fixed z-[61] min-w-[200px] overflow-hidden rounded-[12px] material-glass py-1 shadow-xl"
        :style="{ left: `${position.x}px`, top: `${position.y}px`, transform: 'translate(-50%, -100%)' }"
      >
        <button
          v-for="item in items"
          :key="item.id"
          type="button"
          role="menuitem"
          class="flex w-full px-4 py-3 text-left text-body press-scale"
          :class="item.destructive ? 'text-system-red' : 'text-primary'"
          @click="selectItem(item)"
        >
          {{ item.label }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
