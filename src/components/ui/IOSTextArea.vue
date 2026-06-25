<script setup lang="ts">
defineProps<{
  modelValue: string
  placeholder?: string
  label?: string
  rows?: number
}>()

defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="ios-footnote font-medium uppercase tracking-wide text-ios-tertiary-label px-1">
      {{ label }}
    </label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows ?? 4"
      class="w-full resize-none rounded-[10px] bg-black/5 px-4 py-3 text-[17px] text-black outline-none placeholder:text-ios-tertiary-label focus:ring-2 focus:ring-ios-blue/30 dark:bg-white/10 dark:text-white"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>
