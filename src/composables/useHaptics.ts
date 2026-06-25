import { useReducedMotion } from './useReducedMotion'

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 10],
  warning: [20, 30, 20],
  error: [30, 20, 30, 20, 30],
  selection: 5,
}

export function useHaptics() {
  const { prefersReducedMotion } = useReducedMotion()

  function trigger(pattern: HapticPattern = 'light') {
    if (prefersReducedMotion.value || !navigator.vibrate) return

    const value = PATTERNS[pattern]
    navigator.vibrate(value)
  }

  return { trigger }
}
