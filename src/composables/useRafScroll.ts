import { onMounted, onUnmounted, type Ref } from 'vue'

/** Run scroll handler at most once per animation frame — keeps mobile scroll smooth. */
export function useRafScroll(
  scrollTarget: Ref<HTMLElement | null>,
  callback: (scrollTop: number) => void
) {
  let ticking = false

  function onScroll() {
    if (ticking || !scrollTarget.value) return
    ticking = true
    requestAnimationFrame(() => {
      ticking = false
      if (!scrollTarget.value) return
      callback(scrollTarget.value.scrollTop)
    })
  }

  onMounted(() => {
    scrollTarget.value?.addEventListener('scroll', onScroll, { passive: true })
  })

  onUnmounted(() => {
    scrollTarget.value?.removeEventListener('scroll', onScroll)
  })

  return { onScroll }
}
