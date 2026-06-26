export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'formula'

export type AutomationTrigger = 'on_change' | 'on_load' | 'on_save'
export type ConditionOp = 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'empty' | 'not_empty'

export type SpreadsheetTemplate = 'custom' | 'semester' | 'assignments' | 'interview' | 'study_budget'

export interface SheetColumn {
  id: string
  name: string
  type: ColumnType
  width?: number
  options?: string[]
  formula?: string
  readOnly?: boolean
}

export interface SheetRow {
  id: string
  cells: Record<string, string | number | boolean | null>
}

export interface AutomationCondition {
  column: string
  op: ConditionOp
  value?: string
}

export type AutomationAction =
  | { type: 'set'; targetColumn: string; value: string }
  | { type: 'copy'; targetColumn: string; sourceColumn: string; transform?: 'days_until' | 'uppercase' | 'lowercase' }
  | { type: 'create_task'; titleColumn: string; dueColumn?: string; priorityColumn?: string }
  | { type: 'clear'; targetColumn: string }

export interface AutomationRule {
  id: string
  name: string
  enabled: boolean
  trigger: AutomationTrigger
  watchColumn?: string
  condition?: AutomationCondition
  action: AutomationAction
}

export interface SpreadsheetSheet {
  id: string
  name: string
  columns: SheetColumn[]
  rows: SheetRow[]
  automations: AutomationRule[]
}

export interface SpreadsheetDoc {
  sheets: SpreadsheetSheet[]
  activeSheetId: string | null
}

export interface Spreadsheet {
  id: string
  user_id: string
  title: string
  icon: string
  template: SpreadsheetTemplate
  doc: SpreadsheetDoc
  created_at: string
  updated_at: string
}
