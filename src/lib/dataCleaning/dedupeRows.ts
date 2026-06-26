import type { CleaningColumn, CleaningRow, DedupeStrategy, DuplicateGroup } from '@/types/dataCleaning'

function cellKey(value: string | number | boolean | null | undefined): string {
  if (value == null) return ''
  return String(value).trim().toLowerCase()
}

export function buildRowKey(row: CleaningRow, columnIds: string[]): string {
  return columnIds.map((id) => cellKey(row.values[id])).join('|||')
}

export function findDuplicateGroups(
  rows: CleaningRow[],
  columns: CleaningColumn[],
  keyColumnIds: string[]
): DuplicateGroup[] {
  const keys = keyColumnIds.length ? keyColumnIds : columns.map((c) => c.id)
  const map = new Map<string, string[]>()

  for (const row of rows) {
    const key = buildRowKey(row, keys)
    const list = map.get(key) ?? []
    list.push(row.id)
    map.set(key, list)
  }

  return [...map.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, rowIds]) => ({ key, rowIds }))
    .sort((a, b) => b.rowIds.length - a.rowIds.length)
}

export function removeDuplicateRows(
  rows: CleaningRow[],
  columns: CleaningColumn[],
  keyColumnIds: string[],
  strategy: DedupeStrategy
): { rows: CleaningRow[]; removedCount: number } {
  const keys = keyColumnIds.length ? keyColumnIds : columns.map((c) => c.id)
  const seen = new Map<string, string>()
  const order = strategy === 'first' ? rows : [...rows].reverse()
  const keptIds = new Set<string>()

  for (const row of order) {
    const key = buildRowKey(row, keys)
    if (!seen.has(key)) {
      seen.set(key, row.id)
      keptIds.add(row.id)
    }
  }

  const nextRows = rows.filter((row) => keptIds.has(row.id))
  return {
    rows: nextRows,
    removedCount: rows.length - nextRows.length,
  }
}

export function removeEmptyRows(rows: CleaningRow[], columns: CleaningColumn[]): {
  rows: CleaningRow[]
  removedCount: number
} {
  const nextRows = rows.filter((row) =>
    columns.some((col) => {
      const v = row.values[col.id]
      return v != null && String(v).trim() !== ''
    })
  )
  return { rows: nextRows, removedCount: rows.length - nextRows.length }
}

export function trimWhitespace(
  rows: CleaningRow[],
  columns: CleaningColumn[]
): { rows: CleaningRow[]; cellsTrimmed: number } {
  let cellsTrimmed = 0
  const nextRows = rows.map((row) => {
    const values = { ...row.values }
    for (const col of columns) {
      const v = values[col.id]
      if (typeof v === 'string') {
        const trimmed = v.trim()
        if (trimmed !== v) {
          cellsTrimmed++
          values[col.id] = trimmed === '' ? null : trimmed
        }
      }
    }
    return { ...row, values }
  })
  return { rows: nextRows, cellsTrimmed }
}
