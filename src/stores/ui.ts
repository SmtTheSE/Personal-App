import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export const useUiStore = defineStore('ui', () => {
  const tabBarVisible = ref(true)
  const activeSheetCount = ref(0)
  const globalSearchOpen = ref(false)
  const quickCaptureOpen = ref(false)
  const toasts = ref<Toast[]>([])
  let toastId = 0

  function setTabBarVisible(visible: boolean) {
    tabBarVisible.value = visible
  }

  function openSheet() {
    activeSheetCount.value++
  }

  function closeSheet() {
    activeSheetCount.value = Math.max(0, activeSheetCount.value - 1)
  }

  function showToast(message: string, type: ToastType = 'info', durationMs = 4000) {
    const id = ++toastId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, durationMs)
  }

  function dismissToast(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function openGlobalSearch() {
    globalSearchOpen.value = true
  }

  function closeGlobalSearch() {
    globalSearchOpen.value = false
  }

  function openQuickCapture() {
    quickCaptureOpen.value = true
  }

  function closeQuickCapture() {
    quickCaptureOpen.value = false
  }

  return {
    tabBarVisible,
    activeSheetCount,
    globalSearchOpen,
    quickCaptureOpen,
    toasts,
    setTabBarVisible,
    openSheet,
    closeSheet,
    showToast,
    dismissToast,
    openGlobalSearch,
    closeGlobalSearch,
    openQuickCapture,
    closeQuickCapture,
  }
})
