import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import type { Spreadsheet, SpreadsheetSheet } from '@/types/spreadsheet'
import { formatCellDisplay } from './formulas'

function safeSheetName(name: string, index: number): string {
  const cleaned = name.replace(/[\\/*?:[\]]/g, '').trim() || `Sheet${index + 1}`
  return cleaned.slice(0, 31)
}

function cellExportValue(
  sheet: SpreadsheetSheet,
  row: SpreadsheetSheet['rows'][0],
  col: SpreadsheetSheet['columns'][0]
): string | number | boolean {
  const raw = row.cells[col.id]
  const display = formatCellDisplay(raw ?? null, col, row, sheet.rows)

  if (display === '—' || display === '') return ''
  if (col.type === 'checkbox') return raw ? 'Yes' : 'No'
  if (col.type === 'number' || col.type === 'formula') {
    const n = Number(display)
    return Number.isNaN(n) ? display : n
  }
  return display
}

function sheetToAoA(sheet: SpreadsheetSheet): (string | number | boolean)[][] {
  const header = sheet.columns.map((c) => c.name)
  const rows = sheet.rows.map((row) =>
    sheet.columns.map((col) => cellExportValue(sheet, row, col))
  )
  return [header, ...rows]
}

function automationsAoA(spreadsheet: Spreadsheet): (string | number | boolean)[][] {
  const rows: (string | number | boolean)[][] = [
    ['Sheet', 'Rule', 'Enabled', 'Trigger', 'Description'],
  ]
  for (const sheet of spreadsheet.doc.sheets) {
    for (const rule of sheet.automations) {
      rows.push([
        sheet.name,
        rule.name,
        rule.enabled ? 'Yes' : 'No',
        rule.trigger,
        rule.action.type,
      ])
    }
  }
  return rows
}

export function sanitizeFilename(title: string): string {
  return title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'nexus-workbook'
}

export function exportSpreadsheetToXlsx(spreadsheet: Spreadsheet): Blob {
  const wb = XLSX.utils.book_new()

  spreadsheet.doc.sheets.forEach((sheet, i) => {
    const ws = XLSX.utils.aoa_to_sheet(sheetToAoA(sheet))
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(sheet.name, i))
  })

  const autoRows = automationsAoA(spreadsheet)
  if (autoRows.length > 1) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(autoRows), 'Automations')
  }

  const meta = XLSX.utils.aoa_to_sheet([
    ['Nexus Workbook Export'],
    ['Title', spreadsheet.title],
    ['Template', spreadsheet.template],
    ['Exported', format(new Date(), 'yyyy-MM-dd HH:mm')],
    ['Sheets', spreadsheet.doc.sheets.length],
  ])
  XLSX.utils.book_append_sheet(wb, meta, 'Info')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function exportSheetToCsv(sheet: SpreadsheetSheet): string {
  const aoa = sheetToAoA(sheet)
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  return XLSX.utils.sheet_to_csv(ws)
}

export function exportWorkbookSummaryText(spreadsheet: Spreadsheet): string {
  const lines = [
    `📊 ${spreadsheet.title}`,
    `Exported from Nexus · ${format(new Date(), 'MMM d, yyyy')}`,
    '',
  ]

  for (const sheet of spreadsheet.doc.sheets) {
    lines.push(`── ${sheet.name} (${sheet.rows.length} rows) ──`)
    const header = sheet.columns.map((c) => c.name).join(' | ')
    lines.push(header)
    for (const row of sheet.rows.slice(0, 20)) {
      lines.push(
        sheet.columns
          .map((col) => String(cellExportValue(sheet, row, col)))
          .join(' | ')
      )
    }
    if (sheet.rows.length > 20) lines.push(`… +${sheet.rows.length - 20} more rows`)
    lines.push('')
  }

  return lines.join('\n')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function shareBlob(
  blob: Blob,
  filename: string,
  options: { title: string; text?: string }
): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], filename, { type: blob.type })

  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: options.title,
      text: options.text ?? `Shared from Nexus: ${options.title}`,
    })
    return 'shared'
  }

  downloadBlob(blob, filename)
  return 'downloaded'
}
