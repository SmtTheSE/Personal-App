<script setup lang="ts">
import type { ColumnProfile } from '@/types/dataCleaning'

defineProps<{
  profile: ColumnProfile
  selected?: boolean
}>()

defineEmits<{ select: [] }>()

const typeColors: Record<string, string> = {
  string: 'text-system-blue',
  number: 'text-system-green',
  date: 'text-system-orange',
  boolean: 'text-system-purple',
  mixed: 'text-system-red',
  empty: 'text-tertiary',
}
</script>

<template>
  <button
    type="button"
    class="surface-elevated w-full p-4 text-left press-scale"
    :class="selected ? 'ring-2 ring-system-blue' : ''"
    :style="{ borderRadius: 'var(--radius-card)' }"
    @click="$emit('select')"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0">
        <h3 class="text-headline truncate text-primary">{{ profile.columnName }}</h3>
        <p class="text-caption-1 mt-0.5 capitalize" :class="typeColors[profile.inferredType] ?? 'text-tertiary'">
          {{ profile.inferredType }}
        </p>
      </div>
      <span
        v-if="profile.issues.length"
        class="rounded-full bg-system-orange/15 px-2 py-0.5 text-caption-2 text-system-orange"
      >
        {{ profile.issues.length }} issue{{ profile.issues.length === 1 ? '' : 's' }}
      </span>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2 text-center">
      <div class="rounded-lg fill-tertiary px-2 py-1.5">
        <p class="text-caption-2 text-tertiary">Missing</p>
        <p class="text-subheadline font-semibold text-primary">{{ profile.nullPct }}%</p>
      </div>
      <div class="rounded-lg fill-tertiary px-2 py-1.5">
        <p class="text-caption-2 text-tertiary">Unique</p>
        <p class="text-subheadline font-semibold text-primary">{{ profile.uniqueCount }}</p>
      </div>
      <div class="rounded-lg fill-tertiary px-2 py-1.5">
        <p class="text-caption-2 text-tertiary">Rows</p>
        <p class="text-subheadline font-semibold text-primary">{{ profile.total }}</p>
      </div>
    </div>

    <p v-if="profile.sampleValues.length" class="text-footnote mt-2 line-clamp-2 text-tertiary">
      Sample: {{ profile.sampleValues.join(' · ') }}
    </p>

    <ul v-if="profile.issues.length" class="mt-2 space-y-1">
      <li
        v-for="issue in profile.issues"
        :key="issue"
        class="text-caption-1 text-system-orange"
      >
        • {{ issue }}
      </li>
    </ul>
  </button>
</template>
