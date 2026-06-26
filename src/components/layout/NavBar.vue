<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useCollapsingNav } from '@/composables/useCollapsingNav'
import { useUiStore } from '@/stores/ui'
import { PhCaretLeft, PhGear, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { LAYOUT } from '@/design/constants'

defineProps<{
  title?: string
  large?: boolean
  showBack?: boolean
  showSettings?: boolean
  showSearch?: boolean
  transparent?: boolean
}>()

const router = useRouter()
const ui = useUiStore()

const { isCollapsed, collapseProgress } = useCollapsingNav()

function goBack() {
  router.back()
}

function goSettings() {
  router.push('/settings')
}

function openSearch() {
  ui.openGlobalSearch()
}
</script>

<template>
  <header>
    <!-- Only the compact bar is sticky — large titles scroll with page content -->
    <div class="sticky top-0 z-30 ios-safe-top">
      <div
        class="material-glass-bar scroll-gpu"
        :class="{ 'shadow-sm': isCollapsed }"
      >
        <div
          class="relative grid grid-cols-[auto_1fr_auto] items-center gap-2 px-4"
          :style="{ height: `${LAYOUT.navCompactHeight}px` }"
        >
          <div class="flex min-w-[44px] items-center">
            <button
              v-if="showBack"
              type="button"
              class="flex min-h-[44px] min-w-[44px] items-center gap-0.5 text-system-blue press-scale"
              aria-label="Go back"
              @click="goBack"
            >
              <PhCaretLeft :size="20" weight="bold" />
              <span class="text-body">Back</span>
            </button>
          </div>

          <h1
            v-if="title && (large ? isCollapsed : true)"
            class="compact-title-collapse pointer-events-none truncate text-center text-headline text-primary"
            :style="{ '--nav-collapse': large ? collapseProgress : 1 }"
          >
            {{ title }}
          </h1>
          <div v-else />

          <div class="relative z-10 flex items-center justify-end gap-1">
            <button
              v-if="showSearch"
              type="button"
              class="flex min-h-[44px] min-w-[44px] items-center justify-center text-system-blue press-scale"
              aria-label="Search"
              @click="openSearch"
            >
              <PhMagnifyingGlass :size="22" />
            </button>
            <button
              v-if="showSettings"
              type="button"
              class="flex min-h-[44px] min-w-[44px] items-center justify-center text-system-blue press-scale"
              aria-label="Settings"
              @click="goSettings"
            >
              <PhGear :size="22" />
            </button>
          </div>
        </div>

        <slot />
      </div>
    </div>

    <!-- Large title scrolls away with content so touch-scroll works in the top area -->
    <div
      v-if="large && title"
      class="large-title-collapse pointer-events-none px-4 pb-2 pt-0"
      :style="{ '--nav-collapse': collapseProgress }"
    >
      <h1 class="text-large-title text-primary">{{ title }}</h1>
    </div>
  </header>
</template>
