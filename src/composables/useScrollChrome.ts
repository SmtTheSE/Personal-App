import { ref, type Ref } from 'vue'
import { useRafScroll } from './useRafScroll'

const SCROLL_DELTA_THRESHOLD = 12

export function useScrollChrome(scrollTarget: Ref<HTMLElement | null>) {
  const tabBarVisible = ref(true)
  let lastScrollY = 0

  useRafScroll(scrollTarget, (current) => {
    const delta = current - lastScrollY
    let next = tabBarVisible.value

    if (current <= 0) {
      next = true
    } else if (delta > SCROLL_DELTA_THRESHOLD) {
      next = false
    } else if (delta < -SCROLL_DELTA_THRESHOLD) {
      next = true
    }

    if (next !== tabBarVisible.value) {
      tabBarVisible.value = next
    }

    lastScrollY = current
  })

  function reset() {
    lastScrollY = 0
    tabBarVisible.value = true
  }

  return { tabBarVisible, reset }
}
