<script setup lang="ts">
import { computed } from 'vue'
import type { CleaningColumn, CleaningRow, ColumnProfile } from '@/types/dataCleaning'

const props = defineProps<{
  columns: CleaningColumn[]
  rows: CleaningRow[]
  profiles: ColumnProfile[]
  highlightColumnId?: string | null
  duplicateRowIds?: Set<string>
  maxRows?: number
}>()

const displayRows = computed(() => {
  const limit = props.maxRows ?? 1000
  return props.rows.slice(0, limit)
})

function profileFor(columnId: string) {
  return props.profiles.find((p) => p.columnId === columnId)
}

function cellClass(columnId: string, value: string | number | boolean | null) {
  const profile = profileFor(columnId)
  const classes: string[] = ['text-primary']

  if (props.highlightColumnId === columnId) {
    classes.push('bg-system-blue/10')
  }

  if (value == null || String(value).trim() === '') {
    classes.push('bg-system-orange/10 text-tertiary italic')
  } else if (profile?.issues.some((i) => i.includes('whitespace'))) {
    classes.push('bg-system-orange/10')
  }

  return classes.join(' ')
}

function formatValue(value: string | number | boolean | null) {
  if (value == null || String(value).trim() === '') return '—'
  return String(value)
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-[var(--color-separator)] bg-[var(--color-system-bg)]">
    <div class="overflow-x-auto">
      <table class="w-max min-w-full border-collapse text-footnote">
        <thead>
          <tr class="border-b border-[var(--color-separator)] bg-[var(--color-fill-tertiary)]">
            <th class="sticky left-0 z-20 border-r border-[var(--color-separator)] bg-[var(--color-fill-tertiary)] px-3 py-2.5 text-left text-caption-1 font-semibold text-tertiary">
              #
            </th>
            <th
              v-for="col in columns"
              :key="col.id"
              class="border-r border-[var(--color-separator)] px-3 py-2.5 text-left last:border-r-0"
              :class="highlightColumnId === col.id ? 'bg-system-blue/15' : ''"
            >
              <div class="text-caption-1 font-semibold uppercase tracking-wide text-tertiary">
                {{ col.name }}
              </div>
              <div
                v-if="profileFor(col.id)"
                class="mt-0.5 text-caption-2 capitalize"
                :class="profileFor(col.id)!.issues.length ? 'text-system-orange' : 'text-tertiary'"
              >
                {{ profileFor(col.id)!.inferredType }}
                <span v-if="profileFor(col.id)!.nullPct"> · {{ profileFor(col.id)!.nullPct }}% null</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in displayRows"
            :key="row.id"
            class="border-b border-[var(--color-separator)] last:border-b-0"
            :class="[
              index % 2 === 0 ? '' : 'bg-[var(--color-fill-quaternary)]/40',
              duplicateRowIds?.has(row.id) ? 'bg-system-red/10' : '',
            ]"
          >
            <td class="sticky left-0 z-10 border-r border-[var(--color-separator)] bg-[var(--color-system-bg)] px-3 py-2 text-caption-2 text-tertiary">
              {{ index + 1 }}
            </td>
            <td
              v-for="col in columns"
              :key="col.id"
              class="max-w-[220px] truncate border-r border-[var(--color-separator)] px-3 py-2 last:border-r-0"
              :class="cellClass(col.id, row.values[col.id] ?? null)"
              :title="formatValue(row.values[col.id] ?? null)"
            >
              {{ formatValue(row.values[col.id] ?? null) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="rows.length > displayRows.length" class="border-t border-[var(--color-separator)] px-3 py-2 text-caption-1 text-tertiary">
      Showing first {{ displayRows.length }} of {{ rows.length.toLocaleString() }} rows
    </p>
  </div>
</template>
