<script setup lang="ts">
import type { SheetColumn, SheetRow } from '@/types/spreadsheet'
import { formatCellDisplay } from '@/lib/spreadsheet/formulas'

const props = defineProps<{
  columns: SheetColumn[]
  rows: SheetRow[]
}>()

const emit = defineEmits<{
  cellClick: [rowId: string, columnId: string]
  addRow: []
}>()

function cellClass(column: SheetColumn, display: string) {
  if (column.readOnly || column.type === 'formula') {
    return 'bg-[var(--color-fill-quaternary)] text-secondary'
  }
  const lower = display.toLowerCase()
  if (lower === 'overdue' || lower === 'at risk' || lower === 'due') {
    return 'bg-system-red/10 text-system-red font-medium'
  }
  if (lower === 'excellent' || lower === 'done') {
    return 'bg-system-green/10 text-system-green font-medium'
  }
  return 'text-primary'
}

function displayValue(row: SheetRow, column: SheetColumn) {
  return formatCellDisplay(row.cells[column.id] ?? null, column, row, props.rows)
}
</script>

<template>
  <div class="overflow-hidden rounded-2xl border border-[var(--color-separator)] bg-[var(--color-system-bg)]">
    <div class="overflow-x-auto">
      <table class="w-max min-w-full border-collapse text-footnote">
        <thead>
          <tr class="border-b border-[var(--color-separator)] bg-[var(--color-fill-tertiary)]">
            <th
              v-for="col in columns"
              :key="col.id"
              class="sticky top-0 z-10 border-r border-[var(--color-separator)] px-3 py-2.5 text-left text-caption-1 font-semibold uppercase tracking-wide text-tertiary last:border-r-0"
              :style="{ minWidth: `${col.width ?? 100}px` }"
            >
              {{ col.name }}
              <span v-if="col.type === 'formula'" class="ml-0.5 text-system-purple">ƒ</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, ri) in rows"
            :key="row.id"
            class="border-b border-[var(--color-separator)] last:border-b-0"
            :class="ri % 2 === 0 ? '' : 'bg-[var(--color-fill-quaternary)]/40'"
          >
            <td
              v-for="col in columns"
              :key="col.id"
              class="border-r border-[var(--color-separator)] px-0 py-0 last:border-r-0"
              :style="{ minWidth: `${col.width ?? 100}px` }"
            >
              <button
                type="button"
                class="flex min-h-[44px] w-full items-center px-3 py-2 text-left press-scale"
                :class="cellClass(col, displayValue(row, col))"
                :disabled="col.readOnly"
                @click="emit('cellClick', row.id, col.id)"
              >
                <span class="truncate">{{ displayValue(row, col) || '—' }}</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <button
      type="button"
      class="flex w-full items-center justify-center gap-2 border-t border-[var(--color-separator)] py-3 text-subheadline text-system-blue press-scale"
      @click="emit('addRow')"
    >
      <span class="text-lg leading-none">+</span>
      Add Row
    </button>
  </div>
</template>
