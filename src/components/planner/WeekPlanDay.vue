<script setup lang="ts">
import type { DayPlan } from '@/types/planner'
import PlanBlockCard from '@/components/planner/PlanBlockCard.vue'
import IOSRingProgress from '@/components/ui/IOSRingProgress.vue'

defineProps<{
  day: DayPlan
}>()

const emit = defineEmits<{
  openBlock: [id: string]
}>()
</script>

<template>
  <section>
    <div class="mb-3 flex items-center justify-between px-4">
      <div>
        <h2 class="text-title-3 text-primary">{{ day.label }}</h2>
        <p class="text-footnote text-tertiary">
          {{ day.openTaskCount }} open items
          <span v-if="day.studyGoalMins"> · {{ day.studyScheduledMins }}/{{ day.studyGoalMins }} min study</span>
        </p>
      </div>
      <IOSRingProgress
        v-if="day.studyGoalMins"
        :value="day.studyScheduledMins"
        :max="day.studyGoalMins"
        :size="44"
        :stroke-width="4"
        label="Study"
      />
    </div>

    <div v-if="day.blocks.length" class="space-y-2 px-4">
      <PlanBlockCard
        v-for="block in day.blocks"
        :key="block.id"
        :block="block"
        @open="emit('openBlock', block.id)"
      />
    </div>
    <p v-else class="px-4 text-footnote text-tertiary">No blocks planned — light day.</p>
  </section>
</template>
