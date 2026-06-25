<script setup lang="ts">
import { watch, onUnmounted } from 'vue'
import { useSheetDetent, type SheetDetent } from '@/composables/useSheetDetent'
import { useUiStore } from '@/stores/ui'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    detent?: SheetDetent
    showDetentToggle?: boolean
  }>(),
  { detent: 'large', showDetentToggle: false }
)

const emit = defineEmits<{ close: [] }>()

const uiStore = useUiStore()

const { currentDetent, sheetStyle, setDetent, onDragStart, onDragMove, onDragEnd } = useSheetDetent(props.detent)

let dragStartY = 0

function handleDragStart(e: TouchEvent) {
  dragStartY = onDragStart(e.touches[0].clientY)
}

function handleDragMove(e: TouchEvent) {
  onDragMove(dragStartY, e.touches[0].clientY)
}

function handleDragEnd() {
  onDragEnd(() => emit('close'))
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) uiStore.openSheet()
    else uiStore.closeSheet()
  },
  { immediate: true }
)

onUnmounted(() => {
  if (props.open) uiStore.closeSheet()
})

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 bg-black/40"
        aria-hidden="true"
        @click="handleClose"
      />
    </Transition>
    <Transition name="sheet">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        class="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden material-glass ios-safe-bottom"
        :style="{
          ...sheetStyle,
          borderTopLeftRadius: 'var(--radius-sheet)',
          borderTopRightRadius: 'var(--radius-sheet)',
          transform: sheetStyle.transform,
        }"
      >
        <div
          class="flex shrink-0 cursor-grab flex-col items-center pt-2 pb-1 active:cursor-grabbing"
          @touchstart.passive="handleDragStart"
          @touchmove.passive="handleDragMove"
          @touchend="handleDragEnd"
        >
          <div class="h-1 w-9 rounded-full bg-black/20 dark:bg-white/30" aria-hidden="true" />
        </div>

        <div class="flex shrink-0 items-center justify-between border-b border-[var(--color-separator)] px-4 pb-3 dark:border-[var(--color-separator-dark)]">
          <button type="button" class="min-h-[44px] text-system-blue text-subheadline press-scale" @click="handleClose">
            Cancel
          </button>
          <h2 v-if="title" class="text-headline text-primary">{{ title }}</h2>
          <div class="flex gap-2">
            <button
              v-if="showDetentToggle"
              type="button"
              class="text-footnote text-system-blue"
              @click="setDetent(currentDetent === 'large' ? 'medium' : 'large')"
            >
              {{ currentDetent === 'large' ? 'Medium' : 'Large' }}
            </button>
            <div class="w-14" />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-4 py-4">
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
