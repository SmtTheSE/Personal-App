<script setup lang="ts">
import IOSButton from './IOSButton.vue'

defineProps<{
  title: string
  subtitle?: string
  icon?: unknown
}>()

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="flex flex-col items-center px-6 py-16 text-center">
    <div v-if="icon || $slots.icon" class="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] fill-tertiary text-system-blue">
      <slot name="icon">
        <component :is="icon" :size="32" weight="duotone" />
      </slot>
    </div>
    <h3 class="text-title-3 text-primary">{{ title }}</h3>
    <p v-if="subtitle" class="text-subheadline mt-2 max-w-xs text-tertiary">{{ subtitle }}</p>
    <div v-if="$slots.default" class="mt-6">
      <slot />
    </div>
    <IOSButton v-if="$attrs.onAction" class="mt-6" @click="$emit('action')">
      <slot name="action" />
    </IOSButton>
  </div>
</template>
