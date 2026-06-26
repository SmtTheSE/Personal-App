import { ref } from 'vue'

/** Tab bar stays visible on mobile — auto-hide on scroll caused lost nav and dead taps. */
export function useScrollChrome() {
  const tabBarVisible = ref(true)

  function reset() {
    tabBarVisible.value = true
  }

  return { tabBarVisible, reset }
}
