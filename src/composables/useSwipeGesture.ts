import { ref, computed, watch, onUnmounted, type Ref } from 'vue'

export interface SwipeAction {
  id: string
  label: string
  color: string
  background: string
  side: 'leading' | 'trailing'
  onAction: () => void | Promise<void>
}

const SWIPE_THRESHOLD = 72
const MAX_SWIPE = 120

export function useSwipeGesture(
  rowRef: Ref<HTMLElement | null>,
  actions: SwipeAction[]
) {
  const offsetX = ref(0)
  const isOpen = ref(false)
  const activeSide = ref<'leading' | 'trailing' | null>(null)

  let startX = 0
  let startOffset = 0
  let attachedEl: HTMLElement | null = null

  const leadingActions = computed(() => actions.filter((a) => a.side === 'leading'))
  const trailingActions = computed(() => actions.filter((a) => a.side === 'trailing'))

  function close() {
    offsetX.value = 0
    isOpen.value = false
    activeSide.value = null
  }

  function onTouchStart(e: TouchEvent) {
    startX = e.touches[0].clientX
    startOffset = offsetX.value
  }

  function onTouchMove(e: TouchEvent) {
    const delta = e.touches[0].clientX - startX
    const next = startOffset + delta

    if (leadingActions.value.length && next > 0) {
      offsetX.value = Math.min(next, MAX_SWIPE)
      activeSide.value = 'leading'
    } else if (trailingActions.value.length && next < 0) {
      offsetX.value = Math.max(next, -MAX_SWIPE)
      activeSide.value = 'trailing'
    }
  }

  function onTouchEnd() {
    if (Math.abs(offsetX.value) >= SWIPE_THRESHOLD) {
      isOpen.value = true
      offsetX.value = offsetX.value > 0 ? SWIPE_THRESHOLD : -SWIPE_THRESHOLD
    } else {
      close()
    }
  }

  function attach(el: HTMLElement) {
    detach()
    attachedEl = el
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  }

  function detach() {
    if (!attachedEl) return
    attachedEl.removeEventListener('touchstart', onTouchStart)
    attachedEl.removeEventListener('touchmove', onTouchMove)
    attachedEl.removeEventListener('touchend', onTouchEnd)
    attachedEl = null
  }

  watch(
    rowRef,
    (el) => {
      if (el) attach(el)
      else detach()
    },
    { immediate: true }
  )

  onUnmounted(detach)

  async function triggerAction(action: SwipeAction) {
    await action.onAction()
    close()
  }

  const rowStyle = computed(() => ({
    transform: `translateX(${offsetX.value}px)`,
    transition: isOpen.value ? 'transform 0.25s var(--ease-ios)' : undefined,
    touchAction: 'pan-y',
  }))

  return {
    offsetX,
    isOpen,
    activeSide,
    leadingActions,
    trailingActions,
    rowStyle,
    close,
    triggerAction,
  }
}
