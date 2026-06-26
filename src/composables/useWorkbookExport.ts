import { useUiStore } from '@/stores/ui'
import { useHaptics } from '@/composables/useHaptics'
import type { Spreadsheet } from '@/types/spreadsheet'
import {
  exportSpreadsheetToXlsx,
  exportSheetToCsv,
  exportWorkbookSummaryText,
  sanitizeFilename,
  shareBlob,
  downloadBlob,
} from '@/lib/spreadsheet/exportWorkbook'

export function useWorkbookExport() {
  const ui = useUiStore()
  const { trigger } = useHaptics()

  function xlsxFilename(spreadsheet: Spreadsheet) {
    return `${sanitizeFilename(spreadsheet.title)}-${new Date().toISOString().slice(0, 10)}.xlsx`
  }

  function csvFilename(spreadsheet: Spreadsheet, sheetName: string) {
    return `${sanitizeFilename(spreadsheet.title)}-${sanitizeFilename(sheetName)}.csv`
  }

  async function exportExcel(spreadsheet: Spreadsheet) {
    const blob = exportSpreadsheetToXlsx(spreadsheet)
    downloadBlob(blob, xlsxFilename(spreadsheet))
    trigger('success')
    ui.showToast('Excel file downloaded', 'success')
  }

  async function exportCsv(spreadsheet: Spreadsheet, sheetId?: string) {
    const sheet =
      spreadsheet.doc.sheets.find((s) => s.id === sheetId) ?? spreadsheet.doc.sheets[0]
    if (!sheet) return

    const csv = exportSheetToCsv(sheet)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    downloadBlob(blob, csvFilename(spreadsheet, sheet.name))
    trigger('success')
    ui.showToast('CSV downloaded', 'success')
  }

  async function shareExcel(spreadsheet: Spreadsheet) {
    const blob = exportSpreadsheetToXlsx(spreadsheet)
    const filename = xlsxFilename(spreadsheet)

    try {
      const result = await shareBlob(blob, filename, {
        title: spreadsheet.title,
        text: `${spreadsheet.title} — Nexus workbook`,
      })
      trigger('success')
      ui.showToast(
        result === 'shared' ? 'Shared successfully' : 'Downloaded — share from Files app',
        'success'
      )
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        ui.showToast('Could not share file', 'error')
      }
    }
  }

  async function shareAsText(spreadsheet: Spreadsheet) {
    const text = exportWorkbookSummaryText(spreadsheet)

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: spreadsheet.title, text })
        trigger('success')
        ui.showToast('Shared', 'success')
        return
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }

    await navigator.clipboard.writeText(text)
    trigger('success')
    ui.showToast('Summary copied to clipboard', 'success')
  }

  return { exportExcel, exportCsv, shareExcel, shareAsText }
}
