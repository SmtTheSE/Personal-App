<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  PhHouse,
  PhCalendar,
  PhCheckSquare,
  PhTimer,
  PhBooks,
} from '@phosphor-icons/vue'
import { useUiStore } from '@/stores/ui'
import { useHaptics } from '@/composables/useHaptics'
import { LAYOUT } from '@/design/constants'
import type { TabRouteName } from '@/design/constants'

const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const { tabBarVisible } = storeToRefs(uiStore)
const { trigger } = useHaptics()

const tabs = [
  { name: 'dashboard' as TabRouteName, path: '/', icon: PhHouse, label: 'Today' },
  { name: 'calendar' as TabRouteName, path: '/calendar', icon: PhCalendar, label: 'Plan' },
  { name: 'tasks' as TabRouteName, path: '/tasks', icon: PhCheckSquare, label: 'Tasks' },
  { name: 'focus' as TabRouteName, path: '/focus', icon: PhTimer, label: 'Focus' },
  { name: 'library' as TabRouteName, path: '/library', icon: PhBooks, label: 'Library' },
]

const activeTab = computed(() => {
  const match = tabs.find(
    (t) => t.path === route.path || (t.path !== '/' && route.path.startsWith(t.path))
  )
  return match?.name ?? 'dashboard'
})

const isHidden = computed(() => !tabBarVisible.value || uiStore.activeSheetCount > 0)

function navigate(path: string) {
  if (route.path !== path) {
    trigger('selection')
    router.push(path)
  }
}
</script>

<template>
  <nav
    class="scroll-gpu pointer-events-none fixed inset-x-0 z-40 transition-transform duration-300 ease-[var(--ease-ios)] ios-safe-bottom"
    :style="{
      bottom: `${LAYOUT.tabBarInset}px`,
      transform: isHidden ? 'translateY(calc(100% + 32px))' : 'translateY(0)',
    }"
    aria-label="Main navigation"
  >
    <div
      class="pointer-events-auto mx-auto material-glass-pill flex max-w-lg items-stretch justify-around px-2 py-1.5"
      :style="{
        marginLeft: `${LAYOUT.tabBarInset}px`,
        marginRight: `${LAYOUT.tabBarInset}px`,
        borderRadius: `${LAYOUT.tabBarInset + 8}px`,
        minHeight: `${LAYOUT.minTouchTarget}px`,
      }"
    >
      <button
        v-for="tab in tabs"
        :key="tab.name"
        type="button"
        class="flex flex-1 flex-col items-center justify-center gap-0.5 py-1 press-scale"
        :class="activeTab === tab.name ? 'text-system-blue' : 'text-tertiary'"
        :aria-current="activeTab === tab.name ? 'page' : undefined"
        :aria-label="tab.label"
        @click="navigate(tab.path)"
      >
        <component
          :is="tab.icon"
          :size="24"
          :weight="activeTab === tab.name ? 'fill' : 'regular'"
        />
        <span class="text-caption-2 font-medium">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
