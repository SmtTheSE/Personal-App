<script setup lang="ts">
import { format } from 'date-fns'
import type { PlanTimeBlock } from '@/types/planner'
import { PhBrain, PhCalendar, PhCheckSquare, PhGithubLogo, PhGoogleLogo, PhLightning, PhTimer } from '@phosphor-icons/vue'

defineProps<{
  block: PlanTimeBlock
}>()

defineEmits<{
  open: []
}>()

const icons = {
  google: PhGoogleLogo,
  exam: PhCalendar,
  task: PhCheckSquare,
  focus: PhTimer,
  review: PhBrain,
  study: PhLightning,
  github: PhGithubLogo,
}
</script>

<template>
  <button
    type="button"
    class="flex w-full items-start gap-3 rounded-2xl p-3 text-left press-scale"
    :class="block.suggested ? 'border border-dashed border-system-purple/40 bg-system-purple/5' : 'surface-elevated'"
    @click="$emit('open')"
  >
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      :class="block.suggested ? 'bg-system-purple/15 text-system-purple' : 'bg-system-blue/15 text-system-blue'"
    >
      <component :is="icons[block.sourceType]" :size="18" weight="fill" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-caption-1 text-tertiary">
        {{ block.suggested ? 'Suggested focus' : block.kind === 'deadline' ? 'Due' : 'Scheduled' }}
        · {{ format(block.start, 'h:mm a') }}–{{ format(block.end, 'h:mm a') }}
      </p>
      <p class="text-subheadline text-primary">{{ block.title }}</p>
      <p v-if="block.subtitle" class="text-footnote text-tertiary">{{ block.subtitle }}</p>
    </div>
  </button>
</template>
