<script setup lang="ts">
import { PhMagnifyingGlass, PhX } from '@phosphor-icons/vue'

const model = defineModel<string>({ default: '' })

defineProps<{
  placeholder?: string
}>()
</script>

<template>
  <div class="relative px-4 pb-2">
    <PhMagnifyingGlass
      :size="16"
      class="pointer-events-none absolute left-7 top-1/2 -translate-y-1/2 text-tertiary"
      aria-hidden="true"
    />
    <input
      v-model="model"
      type="search"
      :placeholder="placeholder ?? 'Search'"
      class="w-full rounded-[10px] fill-tertiary py-2.5 pl-9 pr-9 text-subheadline text-primary outline-none placeholder:text-tertiary focus:ring-2 focus:ring-system-blue/30"
    />
    <button
      v-if="model"
      type="button"
      class="absolute right-6 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full fill-tertiary text-tertiary press-scale"
      aria-label="Clear search"
      @click="model = ''"
    >
      <PhX :size="12" weight="bold" />
    </button>
  </div>
</template>
