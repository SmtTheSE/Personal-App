import { ref, onMounted, onUnmounted, type Ref } from 'vue'

const PULL_THRESHOLD = 80
const MAX_PULL = 120

function pageScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || 0
}

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  enabled: Ref<boolean> | boolean = true
) {
  const isPulling = ref(false)
  const pullDistance = ref(0)
  const isRefreshing = ref(false)
  let startY = 0
  let tracking = false

  function isEnabled() {
    return typeof enabled === 'boolean' ? enabled : enabled.value
  }

  function onTouchStart(e: TouchEvent) {
    if (!isEnabled() || pageScrollTop() > 0 || isRefreshing.value) return
    startY = e.touches[0].clientY
    tracking = true
    isPulling.value = false
    pullDistance.value = 0
  }

  function onTouchMove(e: TouchEvent) {
    if (!tracking || isRefreshing.value) return

    const delta = e.touches[0].clientY - startY

    // Finger moving up — user is scrolling into content, not pulling to refresh
    if (delta < -6) {
      tracking = false
      isPulling.value = false
      pullDistance.value = 0
      return
    }

    if (pageScrollTop() > 0) {
      tracking = false
      isPulling.value = false
      pullDistance.value = 0
      return
    }

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

  onMounted(() => {
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    document.addEventListener('touchcancel', onTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', onTouchStart)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('touchend', onTouchEnd)
    document.removeEventListener('touchcancel', onTouchEnd)
  })

  return { pullDistance, isRefreshing, isPulling }
}
