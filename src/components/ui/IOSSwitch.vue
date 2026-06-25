<script setup lang="ts">
const model = defineModel<boolean>({ default: false })

defineProps<{
  label?: string
  disabled?: boolean
}>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="model"
    :aria-label="label"
    :disabled="disabled"
    class="relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-50"
    :class="model ? 'bg-system-green' : 'fill-tertiary'"
    @click="model = !model"
  >
    <span
      class="inline-block h-[27px] w-[27px] rounded-full bg-white shadow transition-transform duration-200"
      :class="model ? 'translate-x-[22px]' : 'translate-x-[2px]'"
      :style="{ transitionTimingFunction: 'var(--ease-spring)' }"
    />
  </button>
</template>
