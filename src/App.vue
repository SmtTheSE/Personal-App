<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { useDark } from '@vueuse/core'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useNotificationPolling } from '@/composables/useNotificationPolling'

useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
  storageKey: 'nexus-dark-mode',
})

useNotificationPolling()

const route = useRoute()
</script>

<template>
  <ToastHost />
  <RouterView v-slot="{ Component }">
    <Transition :name="(route.meta.transition as string) || 'fade'" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
</template>
