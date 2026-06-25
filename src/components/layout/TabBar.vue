<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhHouse,
  PhCheckSquare,
  PhFolder,
  PhBookmarkSimple,
  PhChartLine,
} from '@phosphor-icons/vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'dashboard', path: '/', icon: PhHouse, label: 'Today' },
  { name: 'tasks', path: '/tasks', icon: PhCheckSquare, label: 'Tasks' },
  { name: 'projects', path: '/projects', icon: PhFolder, label: 'Projects' },
  { name: 'resources', path: '/resources', icon: PhBookmarkSimple, label: 'Vault' },
  { name: 'analytics', path: '/analytics', icon: PhChartLine, label: 'Stats' },
]

const activeTab = computed(() => {
  const match = tabs.find((t) => t.path === route.path || route.path.startsWith(t.path + '/'))
  return match?.name ?? 'dashboard'
})

function navigate(path: string) {
  if (route.path !== path) router.push(path)
}
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-ios-separator bg-white/80 ios-blur ios-safe-bottom dark:border-ios-separator-dark dark:bg-black/80">
    <div class="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1 pb-1">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        type="button"
        class="flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors"
        :class="activeTab === tab.name ? 'text-ios-blue' : 'text-ios-tertiary-label'"
        @click="navigate(tab.path)"
      >
        <component :is="tab.icon" :size="24" :weight="activeTab === tab.name ? 'fill' : 'regular'" />
        <span class="ios-caption font-medium">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>
