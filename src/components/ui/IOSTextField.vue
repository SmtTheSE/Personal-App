<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
  type?: string
  label?: string
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="ios-footnote font-medium uppercase tracking-wide text-ios-tertiary-label px-1">
      {{ label }}
    </label>
    <input
      :type="type ?? 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      class="w-full rounded-[10px] bg-black/5 px-4 py-3 text-[17px] text-black outline-none placeholder:text-ios-tertiary-label focus:ring-2 focus:ring-ios-blue/30 dark:bg-white/10 dark:text-white"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </div>
</template>
