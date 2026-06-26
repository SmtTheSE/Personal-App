import { differenceInCalendarDays, parseISO, isValid, format } from 'date-fns'
import type { AutomationRule, SheetRow, SpreadsheetSheet } from '@/types/spreadsheet'
import { evaluateFormula } from './formulas'

function cellStr(row: SheetRow, col: string): string {
  const v = row.cells[col]
  if (v === null || v === undefined) return ''
  return String(v)
}

function parseDate(v: string): Date | null {
  if (!v) return null
  const d = parseISO(v.length === 10 ? v : v.split('T')[0])
  return isValid(d) ? d : null
}

function matchCondition(row: SheetRow, rule: AutomationRule): boolean {
  if (!rule.condition) return true
  const { column, op, value } = rule.condition
  const raw = cellStr(row, column)

  switch (op) {
    case 'empty':
      return raw === ''
    case 'not_empty':
      return raw !== ''
    case 'eq':
      return raw.toLowerCase() === (value ?? '').toLowerCase()
    case 'neq':
      return raw.toLowerCase() !== (value ?? '').toLowerCase()
    case 'lt':
      return Number(raw) < Number(value)
    case 'lte':
      return Number(raw) <= Number(value)
    case 'gt':
      return Number(raw) > Number(value)
    case 'gte':
      return Number(raw) >= Number(value)
    default:
      return false
  }
}

function applyAction(row: SheetRow, rule: AutomationRule): SheetRow {
  const action = rule.action
  const cells = { ...row.cells }

  if (action.type === 'set') {
    cells[action.targetColumn] = action.value
  } else if (action.type === 'copy') {
    let val = cellStr(row, action.sourceColumn)
    if (action.transform === 'days_until') {
      const d = parseDate(val)
      cells[action.targetColumn] = d ? differenceInCalendarDays(d, new Date()) : ''
    } else if (action.transform === 'uppercase') {
      cells[action.targetColumn] = val.toUpperCase()
    } else if (action.transform === 'lowercase') {
      cells[action.targetColumn] = val.toLowerCase()
    } else {
      cells[action.targetColumn] = val
    }
  } else if (action.type === 'clear') {
    cells[action.targetColumn] = ''
  }

  return { ...row, cells }
}

/** Run automations + formula columns for all rows in a sheet */
export function runSheetAutomations(sheet: SpreadsheetSheet): SpreadsheetSheet {
  let rows = sheet.rows.map((r) => ({ ...r, cells: { ...r.cells } }))

  const enabledRules = sheet.automations.filter((a) => a.enabled)

  for (const rule of enabledRules) {
    if (rule.trigger === 'on_load' || rule.trigger === 'on_change' || rule.trigger === 'on_save') {
      rows = rows.map((row) => {
        if (rule.watchColumn && rule.trigger === 'on_change') {
          // on_change batch: run if watch column exists on row
        }
        if (!matchCondition(row, rule)) return row
        return applyAction(row, rule)
      })
    }
  }

  // Date-based status rules (common pattern)
  rows = rows.map((row) => {
    const updated = { ...row, cells: { ...row.cells } }
    return updated
  })

  // Recompute formula columns
  for (const col of sheet.columns) {
    if (col.type === 'formula' && col.formula) {
      rows = rows.map((row) => ({
        ...row,
        cells: {
          ...row.cells,
          [col.id]: evaluateFormula(col.formula!, row, sheet.columns, rows) ?? '',
        },
      }))
    }
  }

  return { ...sheet, rows }
}

export interface TaskSyncPayload {
  title: string
  due_date?: string
  priority?: 'low' | 'medium' | 'high'
}

/** Collect tasks to create from automation rules after row updates */
export function collectTaskSyncs(
  sheet: SpreadsheetSheet,
  changedRowId?: string
): TaskSyncPayload[] {
  const payloads: TaskSyncPayload[] = []
  const rules = sheet.automations.filter((a) => a.enabled && a.action.type === 'create_task')

  for (const row of sheet.rows) {
    if (changedRowId && row.id !== changedRowId) continue
    for (const rule of rules) {
      if (rule.action.type !== 'create_task') continue
      if (!matchCondition(row, rule)) continue
      const title = cellStr(row, rule.action.titleColumn)
      if (!title) continue
      payloads.push({
        title,
        due_date: rule.action.dueColumn ? cellStr(row, rule.action.dueColumn) || undefined : undefined,
        priority: (rule.action.priorityColumn
          ? cellStr(row, rule.action.priorityColumn).toLowerCase()
          : 'medium') as 'low' | 'medium' | 'high',
      })
    }
  }
  return payloads
}

export function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
