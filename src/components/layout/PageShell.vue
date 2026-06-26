<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useScrollChrome } from '@/composables/useScrollChrome'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { useUiStore } from '@/stores/ui'
import { LAYOUT } from '@/design/constants'

const props = withDefaults(
  defineProps<{
    refreshable?: boolean
    onRefresh?: () => Promise<void>
    fab?: boolean
  }>(),
  { refreshable: false, fab: false }
)

const scrollPaddingBottom = computed(() => {
  const base = LAYOUT.tabBarHeight + LAYOUT.tabBarInset
  const fab = props.fab ? LAYOUT.fabSize + LAYOUT.fabMargin : 0
  return `calc(${base + fab}px + env(safe-area-inset-bottom, 0px))`
})

const uiStore = useUiStore()

const { tabBarVisible, reset: resetChrome } = useScrollChrome()
const pull = usePullToRefresh(async () => {
  if (props.refreshable && props.onRefresh) await props.onRefresh()
})

watch(tabBarVisible, (v) => uiStore.setTabBarVisible(v))

onUnmounted(() => {
  resetChrome()
  uiStore.setTabBarVisible(true)
})
</script>

<template>
  <div class="relative min-h-dvh" :style="{ paddingBottom: scrollPaddingBottom }">
    <div
      v-if="refreshable"
      class="pointer-events-none flex items-center justify-center overflow-hidden"
      :class="{ 'transition-[height] duration-200 ease-out': !pull.isPulling.value && !pull.isRefreshing.value }"
      :style="{ height: `${pull.pullDistance.value}px` }"
    >
      <div
        class="h-6 w-6 rounded-full border-2 border-system-blue border-t-transparent"
        :class="{ 'animate-[spin-ios_0.8s_linear_infinite]': pull.isRefreshing.value }"
        :style="{ opacity: Math.min(1, pull.pullDistance.value / 60) }"
      />
    </div>

    <slot name="header" />
    <slot />
  </div>
</template>
