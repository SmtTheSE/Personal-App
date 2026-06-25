import { computed } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

export function useReducedMotion() {
  const preferred = usePreferredReducedMotion()
  const prefersReducedMotion = computed(() => preferred.value === 'reduce')

  function motionStyle(normal: string, reduced = 'none'): string {
    return prefersReducedMotion.value ? reduced : normal
  }

  return { prefersReducedMotion, motionStyle }
}
