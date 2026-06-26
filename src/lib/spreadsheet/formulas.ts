import { differenceInCalendarDays, parseISO, isValid } from 'date-fns'
import type { SheetColumn, SheetRow } from '@/types/spreadsheet'

function cellValue(row: SheetRow, columnId: string): string | number | boolean | null {
  return row.cells[columnId] ?? null
}

function asNumber(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string' && v.trim() !== '') return Number(v)
  return 0
}

function asDate(v: unknown): Date | null {
  if (!v) return null
  if (typeof v === 'string') {
    const d = parseISO(v.length === 10 ? v : v.split('T')[0])
    return isValid(d) ? d : null
  }
  return null
}

/** Evaluate column formula for a single row. Uses $columnId placeholders. */
export function evaluateFormula(
  formula: string,
  row: SheetRow,
  _columns: SheetColumn[],
  allRows?: SheetRow[]
): string | number | null {
  const expr = formula.trim()

  const daysUntilMatch = expr.match(/^DAYS_UNTIL\(\$(\w+)\)$/)
  if (daysUntilMatch) {
    const colId = daysUntilMatch[1]
    const d = asDate(cellValue(row, colId))
    if (!d) return null
    return differenceInCalendarDays(d, new Date())
  }

  const sumMatch = expr.match(/^SUM\(\$(\w+)\)$/)
  if (sumMatch && allRows) {
    const colId = sumMatch[1]
    return allRows.reduce((acc, r) => acc + asNumber(cellValue(r, colId)), 0)
  }

  const avgMatch = expr.match(/^AVG\(\$(\w+)\)$/)
  if (avgMatch && allRows) {
    const colId = avgMatch[1]
    const nums = allRows.map((r) => asNumber(cellValue(r, colId))).filter((n) => !Number.isNaN(n))
    if (!nums.length) return 0
    return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100
  }

  const mulMatch = expr.match(/^\$\{?(\w+)\}?\s*\*\s*\$\{?(\w+)\}?\s*\/\s*(\d+)$/)
  if (mulMatch) {
    const a = asNumber(cellValue(row, mulMatch[1]))
    const b = asNumber(cellValue(row, mulMatch[2]))
    const div = Number(mulMatch[3])
    return Math.round((a * b) / div * 100) / 100
  }

  const refMatch = expr.match(/^\$(\w+)$/)
  if (refMatch) {
    const v = cellValue(row, refMatch[1])
    return v === null ? null : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : v
  }

  return null
}

/** Weighted GPA: sum(grade*credits)/sum(credits) from column ids */
export function computeWeightedGpa(
  rows: SheetRow[],
  gradeCol: string,
  creditsCol: string
): number {
  let totalCredits = 0
  let weighted = 0
  for (const row of rows) {
    const credits = asNumber(cellValue(row, creditsCol))
    const grade = asNumber(cellValue(row, gradeCol))
    if (credits <= 0) continue
    totalCredits += credits
    weighted += (grade / 100) * credits * 4
  }
  if (!totalCredits) return 0
  return Math.round((weighted / totalCredits) * 100) / 100
}

export function formatCellDisplay(
  value: string | number | boolean | null,
  column: SheetColumn,
  row: SheetRow,
  allRows: SheetRow[]
): string {
  if (column.type === 'formula' && column.formula) {
    const result = evaluateFormula(column.formula, row, [], allRows)
    if (result === null) return '—'
    return String(result)
  }
  if (value === null || value === '') return ''
  if (column.type === 'checkbox') return value ? '✓' : ''
  return String(value)
}
