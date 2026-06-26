<script setup lang="ts">
import type { AutomationRule } from '@/types/spreadsheet'
import IOSSwitch from '@/components/ui/IOSSwitch.vue'
import { PhLightning } from '@phosphor-icons/vue'

defineProps<{
  rules: AutomationRule[]
}>()

const emit = defineEmits<{
  toggle: [ruleId: string, enabled: boolean]
}>()

function describeRule(rule: AutomationRule): string {
  const condText = rule.condition
    ? `When ${rule.condition.column} ${rule.condition.op}${rule.condition.value ? ` ${rule.condition.value}` : ''}`
    : 'Always'
  if (rule.action.type === 'set') return `${condText} → set "${rule.action.value}"`
  if (rule.action.type === 'create_task') return `${condText} → sync to Nexus Tasks`
  if (rule.action.type === 'copy') return `${condText} → copy/transform column`
  return rule.name
}
</script>

<template>
  <div class="space-y-2">
    <div
      v-for="rule in rules"
      :key="rule.id"
      class="surface-elevated flex items-start gap-3 p-3"
      :style="{ borderRadius: 'var(--radius-card)' }"
    >
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        :class="rule.enabled ? 'bg-system-orange/15 text-system-orange' : 'fill-tertiary text-tertiary'"
      >
        <PhLightning :size="18" :weight="rule.enabled ? 'fill' : 'regular'" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-subheadline font-medium text-primary">{{ rule.name }}</p>
        <p class="text-caption-1 mt-0.5 text-tertiary">{{ describeRule(rule) }}</p>
        <p class="text-caption-2 mt-1 capitalize text-tertiary">Trigger: {{ rule.trigger.replace('_', ' ') }}</p>
      </div>
      <IOSSwitch
        :model-value="rule.enabled"
        :label="rule.name"
        @update:model-value="emit('toggle', rule.id, $event)"
      />
    </div>
    <p v-if="!rules.length" class="py-6 text-center text-footnote text-tertiary">
      No automations on this sheet yet.
    </p>
  </div>
</template>
