<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useDark } from '@vueuse/core'

useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
  storageKey: 'nexus-dark-mode',
})
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <Transition :name="route.meta.transition as string || 'fade'" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
</template>
