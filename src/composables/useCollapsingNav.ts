import { ref, computed } from 'vue'
import { LAYOUT } from '@/design/constants'
import { useRafScroll } from './useRafScroll'

export function useCollapsingNav() {
  const scrollY = ref(0)

  useRafScroll((top) => {
    if (Math.abs(top - scrollY.value) >= 1) {
      scrollY.value = top
    }
  })

  const isCollapsed = computed(() => scrollY.value > LAYOUT.collapseThreshold)

  const collapseProgress = computed(() =>
    Math.min(1, scrollY.value / LAYOUT.collapseThreshold)
  )

  function reset() {
    scrollY.value = 0
  }

  return { scrollY, isCollapsed, collapseProgress, reset }
}
