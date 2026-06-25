<script setup lang="ts">
import { computed } from 'vue'
import { PhX } from '@phosphor-icons/vue'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  type?: string
  label?: string
  clearable?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const showClear = computed(
  () => props.clearable && props.modelValue.length > 0
)

function clear() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="space-y-1">
    <label v-if="label" class="text-section-header px-1">{{ label }}</label>
    <div class="relative">
      <input
        :type="type ?? 'text'"
        :value="modelValue"
        :placeholder="placeholder"
        class="w-full rounded-[10px] fill-tertiary px-4 py-3 pr-10 text-body text-primary outline-none placeholder:text-tertiary focus:ring-2 focus:ring-system-blue/30"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="showClear"
        type="button"
        class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full fill-tertiary text-tertiary press-scale"
        aria-label="Clear"
        @click="clear"
      >
        <PhX :size="14" weight="bold" />
      </button>
    </div>
  </div>
</template>
