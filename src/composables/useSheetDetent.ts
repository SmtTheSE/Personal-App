import { ref, computed } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { SHEET_DETENTS } from '@/design/constants'

export type SheetDetent = 'medium' | 'large'

export function useSheetDetent(initialDetent: SheetDetent = 'large') {
  const { height: windowHeight } = useWindowSize()
  const currentDetent = ref<SheetDetent>(initialDetent)
  const dragOffset = ref(0)

  const detentHeight = computed(() => {
    const fraction = SHEET_DETENTS[currentDetent.value]
    return windowHeight.value * fraction
  })

  const sheetStyle = computed(() => ({
    height: `${detentHeight.value}px`,
    transform: dragOffset.value > 0 ? `translateY(${dragOffset.value}px)` : undefined,
  }))

  function setDetent(detent: SheetDetent) {
    currentDetent.value = detent
  }

  function onDragStart(clientY: number) {
    return clientY
  }

  function onDragMove(startY: number, currentY: number) {
    const delta = currentY - startY
    if (delta > 0) dragOffset.value = delta
  }

  function onDragEnd(onClose: () => void) {
    if (dragOffset.value > 100) onClose()
    dragOffset.value = 0
  }

  return {
    currentDetent,
    detentHeight,
    sheetStyle,
    setDetent,
    onDragStart,
    onDragMove,
    onDragEnd,
    dragOffset,
  }
}
