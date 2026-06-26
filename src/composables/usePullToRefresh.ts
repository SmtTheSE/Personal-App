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
  let tracking = false

  function onTouchStart(e: TouchEvent) {
    const el = scrollTarget.value
    if (!el || el.scrollTop > 0 || isRefreshing.value) return
    startY = e.touches[0].clientY
    tracking = true
    isPulling.value = false
    pullDistance.value = 0
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking || isRefreshing.value) return
    const el = scrollTarget.value
    if (!el || el.scrollTop > 0) {
      isPulling.value = false
      pullDistance.value = 0
      return
    }

    const delta = e.touches[0].clientY - startY
    if (delta > 4) {
      isPulling.value = true
      pullDistance.value = Math.min(delta * 0.4, MAX_PULL)
    } else {
      isPulling.value = false
      pullDistance.value = 0
    }
  }

  async function onTouchEnd() {
    if (!tracking) return
    tracking = false

    if (pullDistance.value >= PULL_THRESHOLD && !isRefreshing.value) {
      isRefreshing.value = true
      try {
        await onRefresh()
      } finally {
        isRefreshing.value = false
      }
    }

    isPulling.value = false
    pullDistance.value = 0
  }

  function attach() {
    const el = scrollTarget.value
    if (!el) return
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('touchcancel', onTouchEnd, { passive: true })
  }

  function detach() {
    const el = scrollTarget.value
    if (!el) return
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', onTouchEnd)
  }

  return { pullDistance, isRefreshing, isPulling, attach, detach }
}
