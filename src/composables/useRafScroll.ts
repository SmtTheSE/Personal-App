import { onMounted, onUnmounted, type Ref } from 'vue'

function readScrollTop(target?: HTMLElement | null): number {
  if (target) return target.scrollTop
  return window.scrollY || document.documentElement.scrollTop || 0
}

/** Run scroll handler at most once per animation frame — keeps mobile scroll smooth. */
export function useRafScroll(
  callback: (scrollTop: number) => void,
  scrollTarget?: Ref<HTMLElement | null>
) {
  let ticking = false

  function onScroll() {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      ticking = false
      callback(readScrollTop(scrollTarget?.value ?? null))
    })
  }

  onMounted(() => {
    const el = scrollTarget?.value
    if (el) {
      el.addEventListener('scroll', onScroll, { passive: true })
    } else {
      window.addEventListener('scroll', onScroll, { passive: true })
    }
  })

  onUnmounted(() => {
    const el = scrollTarget?.value
    if (el) {
      el.removeEventListener('scroll', onScroll)
    } else {
      window.removeEventListener('scroll', onScroll)
    }
  })

  return { onScroll }
}
