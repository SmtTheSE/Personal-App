import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import type { CleaningSession } from '@/types/dataCleaning'
import { downloadBlob } from '@/lib/spreadsheet/exportWorkbook'

function sessionToAoA(session: CleaningSession): (string | number | boolean | null)[][] {
  const header = session.columns.map((c) => c.name)
  const body = session.rows.map((row) =>
    session.columns.map((col) => row.values[col.id] ?? null)
  )
  return [header, ...body]
}

export function exportSessionToXlsx(session: CleaningSession): Blob {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(sessionToAoA(session))
  XLSX.utils.book_append_sheet(wb, ws, 'Cleaned')

  const profileRows: (string | number)[][] = [
    ['Column', 'Type', 'Missing %', 'Unique', 'Issues'],
    ...session.profiles.map((p) => [
      p.columnName,
      p.inferredType,
      p.nullPct,
      p.uniqueCount,
      p.issues.join('; ') || '—',
    ]),
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(profileRows), 'Profile')

  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function exportSessionToCsv(session: CleaningSession): string {
  const ws = XLSX.utils.aoa_to_sheet(sessionToAoA(session))
  return XLSX.utils.sheet_to_csv(ws)
}

export function downloadCleanedSession(session: CleaningSession, formatType: 'xlsx' | 'csv') {
  const safeName = session.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') || 'cleaned-data'
  const stamp = format(new Date(), 'yyyy-MM-dd')

  if (formatType === 'csv') {
    const csv = exportSessionToCsv(session)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${safeName}-${stamp}.csv`)
    return
  }

  downloadBlob(exportSessionToXlsx(session), `${safeName}-${stamp}.xlsx`)
}
