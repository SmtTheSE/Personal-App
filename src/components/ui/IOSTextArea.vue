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
    <label v-if="label" class="text-section-header px-1">{{ label }}</label>
    <textarea
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows ?? 4"
      class="w-full resize-none rounded-[10px] fill-tertiary px-4 py-3 text-body text-primary outline-none placeholder:text-tertiary focus:ring-2 focus:ring-system-blue/30"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>
