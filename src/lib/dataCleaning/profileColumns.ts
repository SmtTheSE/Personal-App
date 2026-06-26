import { isValid, parseISO } from 'date-fns'
import type { CleaningColumn, CleaningRow, ColumnProfile, InferredColumnType } from '@/types/dataCleaning'

function cellText(value: string | number | boolean | null | undefined): string {
  if (value == null) return ''
  return String(value).trim()
}

function isNullish(value: string | number | boolean | null | undefined): boolean {
  return value == null || cellText(value) === ''
}

function looksLikeNumber(text: string): boolean {
  if (!text) return false
  const n = Number(text.replace(/,/g, ''))
  return !Number.isNaN(n) && text !== ''
}

function looksLikeDate(text: string): boolean {
  if (!text) return false
  const d = parseISO(text.length === 10 ? text : text.split('T')[0])
  return isValid(d)
}

function looksLikeBoolean(text: string): boolean {
  const lower = text.toLowerCase()
  return ['true', 'false', 'yes', 'no', '0', '1', 'y', 'n'].includes(lower)
}

function inferType(values: string[]): InferredColumnType {
  const nonEmpty = values.filter((v) => v !== '')
  if (!nonEmpty.length) return 'empty'

  let num = 0
  let date = 0
  let bool = 0
  let str = 0

  for (const v of nonEmpty) {
    if (looksLikeBoolean(v) && v.length <= 5) bool++
    else if (looksLikeNumber(v)) num++
    else if (looksLikeDate(v)) date++
    else str++
  }

  const total = nonEmpty.length
  const dominant = Math.max(num, date, bool, str)
  const ratio = dominant / total

  if (ratio < 0.7) return 'mixed'
  if (num === dominant) return 'number'
  if (date === dominant) return 'date'
  if (bool === dominant) return 'boolean'
  return 'string'
}

function detectIssues(
  column: CleaningColumn,
  values: string[],
  inferredType: InferredColumnType,
  nullPct: number,
  uniqueCount: number,
  total: number
): string[] {
  const issues: string[] = []

  if (nullPct >= 50) issues.push('High missing rate (≥50%)')
  else if (nullPct >= 20) issues.push('Moderate missing values (≥20%)')

  if (inferredType === 'mixed') issues.push('Mixed data types in column')
  if (inferredType === 'empty') issues.push('Column is entirely empty')

  const hasWhitespace = values.some((v) => v !== v.trim() && v.trim() !== '')
  if (hasWhitespace) issues.push('Leading/trailing whitespace detected')

  if (uniqueCount === 1 && total > 1 && nullPct < 100) issues.push('Single unique value (constant column)')
  if (uniqueCount === total && total > 10 && inferredType === 'string') {
    issues.push('All values unique — possible ID column')
  }

  if (column.name.toLowerCase().includes('email')) {
    const invalid = values.filter((v) => v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
    if (invalid.length) issues.push(`${invalid.length} invalid email format(s)`)
  }

  return issues
}

export function profileColumns(columns: CleaningColumn[], rows: CleaningRow[]): ColumnProfile[] {
  return columns.map((column) => {
    const rawValues = rows.map((row) => row.values[column.id])
    const texts = rawValues.map((v) => cellText(v))
    const nullCount = rawValues.filter((v) => isNullish(v)).length
    const total = rows.length
    const nonEmptyTexts = texts.filter((t) => t !== '')
    const uniqueCount = new Set(nonEmptyTexts).size
    const inferredType = inferType(texts)
    const nullPct = total ? Math.round((nullCount / total) * 100) : 0
    const sampleValues = [...new Set(nonEmptyTexts)].slice(0, 5)
    const issues = detectIssues(column, texts, inferredType, nullPct, uniqueCount, total)

    return {
      columnId: column.id,
      columnName: column.name,
      inferredType,
      total,
      nullCount,
      nullPct,
      uniqueCount,
      sampleValues,
      issues,
    }
  })
}

export function columnsWithIssues(profiles: ColumnProfile[]): ColumnProfile[] {
  return profiles.filter((p) => p.issues.length > 0)
}
