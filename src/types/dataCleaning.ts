export type CleaningView = 'profile' | 'data' | 'duplicates' | 'summary'

export type InferredColumnType = 'string' | 'number' | 'date' | 'boolean' | 'mixed' | 'empty'

export type DedupeStrategy = 'first' | 'last'

export interface CleaningColumn {
  id: string
  name: string
  index: number
}

export interface CleaningRow {
  id: string
  values: Record<string, string | number | boolean | null>
}

export interface ColumnProfile {
  columnId: string
  columnName: string
  inferredType: InferredColumnType
  total: number
  nullCount: number
  nullPct: number
  uniqueCount: number
  sampleValues: string[]
  issues: string[]
}

export interface DuplicateGroup {
  key: string
  rowIds: string[]
}

export interface CleaningStats {
  originalRowCount: number
  currentRowCount: number
  duplicateRowsRemoved: number
  whitespaceTrimmed: number
  emptyRowsRemoved: number
}

export interface CleaningSession {
  id: string
  title: string
  sourceFilename: string
  sourceType: 'csv' | 'xlsx' | 'xls'
  sheetName: string
  columns: CleaningColumn[]
  rows: CleaningRow[]
  profiles: ColumnProfile[]
  duplicateGroups: DuplicateGroup[]
  dedupeKeyColumnIds: string[]
  dedupeStrategy: DedupeStrategy
  activeView: CleaningView
  stats: CleaningStats
  createdAt: string
  updatedAt: string
}
