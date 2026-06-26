<script setup lang="ts">
import { inject, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCollapsingNav } from '@/composables/useCollapsingNav'
import { useUiStore } from '@/stores/ui'
import { PhCaretLeft, PhGear, PhMagnifyingGlass } from '@phosphor-icons/vue'
import { LAYOUT } from '@/design/constants'

const props = defineProps<{
  title?: string
  large?: boolean
  showBack?: boolean
  showSettings?: boolean
  showSearch?: boolean
  transparent?: boolean
}>()

const scrollRef = inject<Ref<HTMLElement | null>>('pageScrollRef', ref(null))
const router = useRouter()
const ui = useUiStore()

const { isCollapsed, collapseProgress } = useCollapsingNav(scrollRef)

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
  <header class="sticky top-0 z-30 ios-safe-top">
    <div
      class="material-glass-bar scroll-gpu"
      :class="{ 'shadow-sm': isCollapsed }"
    >
      <!-- Compact bar -->
      <div
        class="flex items-center justify-between px-4"
        :style="{ height: `${LAYOUT.navCompactHeight}px` }"
      >
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
        <div v-else class="w-16" />

        <h1
          v-if="title && (large ? isCollapsed : true)"
          class="compact-title-collapse text-headline text-primary absolute left-1/2 -translate-x-1/2 truncate max-w-[50%]"
          :style="{ '--nav-collapse': large ? collapseProgress : 1 }"
        >
          {{ title }}
        </h1>

        <div class="flex items-center gap-1">
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
        <div v-if="!showSearch && !showSettings" class="w-16" />
      </div>

      <!-- Large title -->
      <div
        v-if="large && title"
        class="large-title-collapse px-4 pb-2 pt-0"
        :style="{ '--nav-collapse': collapseProgress }"
      >
        <h1 class="text-large-title text-primary">{{ title }}</h1>
      </div>

      <slot />
    </div>
  </header>
</template>
