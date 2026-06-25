<script setup lang="ts">
import { PhCaretRight } from '@phosphor-icons/vue'

defineProps<{
  title?: string
  subtitle?: string
  showChevron?: boolean
  destructive?: boolean
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-black/5 dark:active:bg-white/10"
    :class="{ 'text-ios-red': destructive }"
    @click="$emit('click')"
  >
    <div v-if="$slots.icon" class="shrink-0 text-ios-blue">
      <slot name="icon" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="ios-headline truncate" :class="destructive ? 'text-ios-red' : 'text-black dark:text-white'">
        <slot>{{ title }}</slot>
      </p>
      <p v-if="subtitle || $slots.subtitle" class="ios-footnote mt-0.5 text-ios-tertiary-label">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>
    </div>
    <div v-if="$slots.trailing" class="shrink-0">
      <slot name="trailing" />
    </div>
    <PhCaretRight v-else-if="showChevron" :size="16" class="shrink-0 text-ios-tertiary-label" weight="bold" />
  </button>
</template>
