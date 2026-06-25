import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const tabBarVisible = ref(true)
  const activeSheetCount = ref(0)

  const isTabBarVisible = () => tabBarVisible.value && activeSheetCount.value === 0

  function setTabBarVisible(visible: boolean) {
    tabBarVisible.value = visible
  }

  function openSheet() {
    activeSheetCount.value++
  }

  function closeSheet() {
    activeSheetCount.value = Math.max(0, activeSheetCount.value - 1)
  }

  return {
    tabBarVisible,
    activeSheetCount,
    isTabBarVisible,
    setTabBarVisible,
    openSheet,
    closeSheet,
  }
})
