import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { LAYOUT } from '@/design/constants'

export function useCollapsingNav(scrollTarget: Ref<HTMLElement | null>) {
  const scrollY = ref(0)
  const isCollapsed = computed(() => scrollY.value > LAYOUT.collapseThreshold)

  const collapseProgress = computed(() =>
    Math.min(1, scrollY.value / LAYOUT.collapseThreshold)
  )

  const barOpacity = computed(() =>
    Math.min(1, 0.72 + collapseProgress.value * 0.28)
  )

  function onScroll() {
    if (!scrollTarget.value) return
    scrollY.value = scrollTarget.value.scrollTop
  }

  onMounted(() => {
    scrollTarget.value?.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    scrollTarget.value?.removeEventListener('scroll', onScroll)
  })

  function reset() {
    scrollY.value = 0
  }

  return { scrollY, isCollapsed, collapseProgress, barOpacity, reset }
}
