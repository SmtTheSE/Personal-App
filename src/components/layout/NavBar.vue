<script setup lang="ts">
import { inject, computed, ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCollapsingNav } from '@/composables/useCollapsingNav'
import { PhCaretLeft, PhGear } from '@phosphor-icons/vue'
import { LAYOUT } from '@/design/constants'

const props = defineProps<{
  title?: string
  large?: boolean
  showBack?: boolean
  showSettings?: boolean
  transparent?: boolean
}>()

const scrollRef = inject<Ref<HTMLElement | null>>('pageScrollRef', ref(null))
const router = useRouter()

const { isCollapsed, collapseProgress } = useCollapsingNav(scrollRef)

const largeTitleOpacity = computed(() => 1 - collapseProgress.value)
const compactTitleOpacity = computed(() => collapseProgress.value)

function goBack() {
  router.back()
}

function goSettings() {
  router.push('/settings')
}
</script>

<template>
  <header class="sticky top-0 z-30 ios-safe-top">
    <div
      class="material-glass-bar transition-shadow duration-200"
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
          class="text-headline text-primary absolute left-1/2 -translate-x-1/2 truncate max-w-[50%]"
          :style="{ opacity: large ? compactTitleOpacity : 1 }"
        >
          {{ title }}
        </h1>

        <button
          v-if="showSettings"
          type="button"
          class="flex min-h-[44px] min-w-[44px] items-center justify-center text-system-blue press-scale"
          aria-label="Settings"
          @click="goSettings"
        >
          <PhGear :size="22" />
        </button>
        <div v-else class="w-16" />
      </div>

      <!-- Large title -->
      <div
        v-if="large && title"
        class="px-4 pb-2 pt-0 transition-opacity duration-200"
        :style="{ opacity: largeTitleOpacity }"
      >
        <h1 class="text-large-title text-primary">{{ title }}</h1>
      </div>

      <slot />
    </div>
  </header>
</template>
