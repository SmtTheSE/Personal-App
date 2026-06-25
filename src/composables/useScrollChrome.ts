import { ref, onMounted, onUnmounted, type Ref } from 'vue'

const SCROLL_DELTA_THRESHOLD = 8

export function useScrollChrome(scrollTarget: Ref<HTMLElement | null>) {
  const tabBarVisible = ref(true)
  let lastScrollY = 0

  function onScroll() {
    if (!scrollTarget.value) return
    const current = scrollTarget.value.scrollTop
    const delta = current - lastScrollY

    if (current <= 0) {
      tabBarVisible.value = true
    } else if (delta > SCROLL_DELTA_THRESHOLD) {
      tabBarVisible.value = false
    } else if (delta < -SCROLL_DELTA_THRESHOLD) {
      tabBarVisible.value = true
    }

    lastScrollY = current
  }

  onMounted(() => {
    scrollTarget.value?.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    scrollTarget.value?.removeEventListener('scroll', onScroll)
  })

  function reset() {
    lastScrollY = 0
    tabBarVisible.value = true
  }

  return { tabBarVisible, reset }
}
