<script setup lang="ts">
import { useRouter } from 'vue-router'
import { PhCaretLeft, PhGear } from '@phosphor-icons/vue'

defineProps<{
  title?: string
  large?: boolean
  showBack?: boolean
  showSettings?: boolean
}>()

const router = useRouter()

function goBack() {
  router.back()
}

function goSettings() {
  router.push('/settings')
}
</script>

<template>
  <header class="sticky top-0 z-30 ios-safe-top">
    <div class="ios-blur border-b border-ios-separator bg-white/80 dark:border-ios-separator-dark dark:bg-black/80">
      <div v-if="showBack || showSettings" class="flex h-11 items-center justify-between px-4">
        <button
          v-if="showBack"
          type="button"
          class="flex items-center gap-0.5 text-ios-blue"
          @click="goBack"
        >
          <PhCaretLeft :size="20" weight="bold" />
          <span class="ios-body">Back</span>
        </button>
        <div v-else class="w-16" />
        <h1 v-if="!large && title" class="ios-headline">{{ title }}</h1>
        <div v-else class="w-16" />
        <button
          v-if="showSettings"
          type="button"
          class="text-ios-blue"
          @click="goSettings"
        >
          <PhGear :size="22" />
        </button>
        <div v-else class="w-16" />
      </div>
      <div v-if="large && title" class="px-4 pb-2 pt-1">
        <h1 class="ios-large-title text-black dark:text-white">{{ title }}</h1>
      </div>
      <slot />
    </div>
  </header>
</template>
