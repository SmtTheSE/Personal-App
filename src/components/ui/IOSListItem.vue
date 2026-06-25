<script setup lang="ts">
import { PhCaretRight } from '@phosphor-icons/vue'
import { LAYOUT } from '@/design/constants'

defineProps<{
  title?: string
  subtitle?: string
  showChevron?: boolean
  destructive?: boolean
  insetSeparator?: boolean
}>()

defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 bg-transparent px-4 text-left transition-colors active:opacity-80 press-scale"
    :class="destructive ? 'text-system-red' : ''"
    :style="{ minHeight: `${LAYOUT.listRowHeightRich}px` }"
    @click="$emit('click')"
  >
    <div v-if="$slots.icon" class="flex w-7 shrink-0 items-center justify-center text-system-blue">
      <slot name="icon" />
    </div>
    <div class="min-w-0 flex-1 py-3">
      <p class="text-headline truncate" :class="destructive ? 'text-system-red' : 'text-primary'">
        <slot>{{ title }}</slot>
      </p>
      <p v-if="subtitle || $slots.subtitle" class="text-footnote mt-0.5 text-tertiary">
        <slot name="subtitle">{{ subtitle }}</slot>
      </p>
    </div>
    <div v-if="$slots.trailing" class="shrink-0 pb-3" @click.stop>
      <slot name="trailing" />
    </div>
    <PhCaretRight
      v-else-if="showChevron"
      :size="16"
      class="shrink-0 pb-3 text-tertiary"
      weight="bold"
      aria-hidden="true"
    />
  </button>
</template>
