import { useUiStore } from '@/stores/ui'
import { formatSupabaseError } from '@/lib/errors'

export function useAsyncAction() {
  const ui = useUiStore()

  async function run<T>(
    action: () => Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
  ): Promise<T | undefined> {
    try {
      const result = await action()
      if (options?.successMessage) {
        ui.showToast(options.successMessage, 'success')
      }
      return result
    } catch (error) {
      const message = options?.errorMessage ?? formatSupabaseError(error)
      ui.showToast(message, 'error')
      return undefined
    }
  }

  return { run }
}
