import * as XLSX from 'xlsx'
import type { CleaningColumn, CleaningRow } from '@/types/dataCleaning'

/** Client-side parse limits (Vercel never sees file bytes). */
export const MAX_FILE_BYTES = 200 * 1024 * 1024
/** Show a performance notice above this row count — not a hard cap. */
export const LARGE_DATASET_ROW_WARNING = 200_000

export interface ParsedDataset {
  title: string
  sourceFilename: string
  sourceType: 'csv' | 'xlsx' | 'xls'
  sheetName: string
  columns: CleaningColumn[]
  rows: CleaningRow[]
}

function sourceTypeFromName(name: string): 'csv' | 'xlsx' | 'xls' {
  const lower = name.toLowerCase()
  if (lower.endsWith('.csv')) return 'csv'
  if (lower.endsWith('.xls')) return 'xls'
  return 'xlsx'
}

function normalizeHeader(value: unknown, index: number): string {
  const raw = value == null ? '' : String(value).trim()
  return raw || `Column ${index + 1}`
}

function normalizeCell(value: unknown): string | number | boolean | null {
  if (value == null || value === '') return null
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const text = String(value).trim()
  return text === '' ? null : text
}

function rowId(index: number) {
  return `row-${index}`
}

function columnId(index: number) {
  return `col-${index}`
}

export async function parseCleaningFile(file: File): Promise<ParsedDataset> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `File too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max ${MAX_FILE_BYTES / (1024 * 1024)} MB per file in the browser.`
    )
  }

  const sourceType = sourceTypeFromName(file.name)
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true, raw: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('No sheets found in file.')

  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  })

  if (!matrix.length) throw new Error('File is empty.')

  const headerRow = matrix[0] ?? []
  const headerCount = Math.max(headerRow.length, ...matrix.slice(1).map((r) => r.length))
  const headers = Array.from({ length: headerCount }, (_, i) => normalizeHeader(headerRow[i], i))

  const columns: CleaningColumn[] = headers.map((name, index) => ({
    id: columnId(index),
    name,
    index,
  }))

  const dataRows = matrix.slice(1)

  const rows: CleaningRow[] = dataRows.map((raw, rowIndex) => {
    const values: Record<string, string | number | boolean | null> = {}
    for (const col of columns) {
      values[col.id] = normalizeCell(raw[col.index])
    }
    return { id: rowId(rowIndex), values }
  })

  const title = file.name.replace(/\.(csv|xlsx|xls)$/i, '') || 'Dataset'

  return {
    title,
    sourceFilename: file.name,
    sourceType,
    sheetName,
    columns,
    rows,
  }
}
