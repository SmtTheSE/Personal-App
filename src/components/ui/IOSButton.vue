<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'destructive' | 'plain'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    block?: boolean
  }>(),
  { variant: 'primary', size: 'md', loading: false, block: false }
)
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
    :class="[
      block ? 'w-full' : '',
      size === 'sm' ? 'h-8 px-3 text-[15px] rounded-lg' : '',
      size === 'md' ? 'h-[44px] px-5 text-[17px] rounded-[10px]' : '',
      size === 'lg' ? 'h-[50px] px-6 text-[17px] rounded-[12px]' : '',
      variant === 'primary' ? 'bg-ios-blue text-white' : '',
      variant === 'secondary' ? 'bg-ios-blue/10 text-ios-blue dark:bg-ios-blue/20' : '',
      variant === 'destructive' ? 'bg-ios-red/10 text-ios-red' : '',
      variant === 'plain' ? 'bg-transparent text-ios-blue' : '',
    ]"
    :disabled="loading"
  >
    <span v-if="loading" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    <slot />
  </button>
</template>
