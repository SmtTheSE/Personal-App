import { ref, type Ref } from 'vue'

const PULL_THRESHOLD = 80
const MAX_PULL = 120

export function usePullToRefresh(
  scrollTarget: Ref<HTMLElement | null>,
  onRefresh: () => Promise<void>
) {
  const isPulling = ref(false)
  const pullDistance = ref(0)
  const isRefreshing = ref(false)
  let startY = 0

  function onTouchStart(e: TouchEvent) {
    if (!scrollTarget.value || scrollTarget.value.scrollTop > 0) return
    startY = e.touches[0].clientY
    isPulling.value = true
  }

  function onTouchMove(e: TouchEvent) {
    if (!isPulling.value || isRefreshing.value) return
    const delta = e.touches[0].clientY - startY
    if (delta > 0) {
      pullDistance.value = Math.min(delta * 0.5, MAX_PULL)
      if (pullDistance.value > 10) e.preventDefault()
    }
  }

  async function onTouchEnd() {
    if (!isPulling.value) return
    isPulling.value = false

    if (pullDistance.value >= PULL_THRESHOLD && !isRefreshing.value) {
      isRefreshing.value = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    }
    pullDistance.value = 0
  }

  function attach() {
    const el = scrollTarget.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
  }

  function detach() {
    const el = scrollTarget.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
  }

  return { pullDistance, isRefreshing, isPulling, attach, detach }
}
