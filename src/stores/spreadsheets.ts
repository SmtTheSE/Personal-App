import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { runSheetAutomations, collectTaskSyncs } from '@/lib/spreadsheet/automationEngine'
import { computeWeightedGpa } from '@/lib/spreadsheet/formulas'
import { createTemplateDoc } from '@/lib/spreadsheet/templates'
import type { Spreadsheet, SpreadsheetDoc, SpreadsheetSheet, SpreadsheetTemplate } from '@/types/spreadsheet'

function newRowId() {
  return `row_${Math.random().toString(36).slice(2, 9)}`
}

export const useSpreadsheetsStore = defineStore('spreadsheets', () => {
  const spreadsheets = ref<Spreadsheet[]>([])
  const loading = ref(false)

  const sorted = computed(() =>
    [...spreadsheets.value].sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  )

  function getById(id: string) {
    return spreadsheets.value.find((s) => s.id === id)
  }

  async function fetchSpreadsheets() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from('spreadsheets')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      spreadsheets.value = (data ?? []) as Spreadsheet[]
    } finally {
      loading.value = false
    }
  }

  async function createSpreadsheet(title: string, template: SpreadsheetTemplate = 'custom') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const meta = template !== 'custom' ? template : 'custom'
    const catalog = {
      semester: '🎓',
      assignments: '📋',
      interview: '💻',
      study_budget: '⏱️',
      custom: '📊',
    }

    const doc = createTemplateDoc(template)
    const processed = {
      ...doc,
      sheets: doc.sheets.map((s) => runSheetAutomations(s)),
    }

    const { data, error } = await supabase
      .from('spreadsheets')
      .insert({
        user_id: user.id,
        title,
        icon: catalog[meta],
        template: meta,
        doc: processed,
      })
      .select()
      .single()

    if (error) throw error
    spreadsheets.value.unshift(data as Spreadsheet)
    return data as Spreadsheet
  }

  async function saveDoc(id: string, doc: SpreadsheetDoc) {
    const processed: SpreadsheetDoc = {
      ...doc,
      sheets: doc.sheets.map((s) => runSheetAutomations(s)),
    }

    const { data, error } = await supabase
      .from('spreadsheets')
      .update({ doc: processed })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    const idx = spreadsheets.value.findIndex((s) => s.id === id)
    if (idx !== -1) spreadsheets.value[idx] = data as Spreadsheet
    return data as Spreadsheet
  }

  function getActiveSheet(spreadsheet: Spreadsheet): SpreadsheetSheet | null {
    const { doc } = spreadsheet
    if (!doc.sheets.length) return null
    return doc.sheets.find((s) => s.id === doc.activeSheetId) ?? doc.sheets[0]
  }

  function updateCell(
    spreadsheet: Spreadsheet,
    sheetId: string,
    rowId: string,
    columnId: string,
    value: string | number | boolean | null
  ): SpreadsheetDoc {
    const doc = structuredClone(spreadsheet.doc)
    const sheet = doc.sheets.find((s) => s.id === sheetId)
    if (!sheet) return doc

    const row = sheet.rows.find((r) => r.id === rowId)
    if (!row) return doc
    row.cells[columnId] = value

    const sheetIdx = doc.sheets.findIndex((s) => s.id === sheetId)
    doc.sheets[sheetIdx] = runSheetAutomations(sheet)
    return doc
  }

  function addRow(spreadsheet: Spreadsheet, sheetId: string): SpreadsheetDoc {
    const doc = structuredClone(spreadsheet.doc)
    const sheet = doc.sheets.find((s) => s.id === sheetId)
    if (!sheet) return doc

    const cells: Record<string, string | number | boolean | null> = {}
    for (const col of sheet.columns) {
      if (col.type === 'checkbox') cells[col.id] = false
      else if (col.type === 'number') cells[col.id] = 0
      else cells[col.id] = ''
    }
    sheet.rows.push({ id: newRowId(), cells })

    const sheetIdx = doc.sheets.findIndex((s) => s.id === sheetId)
    doc.sheets[sheetIdx] = runSheetAutomations(sheet)
    return doc
  }

  function deleteRow(spreadsheet: Spreadsheet, sheetId: string, rowId: string): SpreadsheetDoc {
    const doc = structuredClone(spreadsheet.doc)
    const sheet = doc.sheets.find((s) => s.id === sheetId)
    if (!sheet) return doc
    sheet.rows = sheet.rows.filter((r) => r.id !== rowId)
    return doc
  }

  function toggleAutomation(
    spreadsheet: Spreadsheet,
    sheetId: string,
    ruleId: string,
    enabled: boolean
  ): SpreadsheetDoc {
    const doc = structuredClone(spreadsheet.doc)
    const sheet = doc.sheets.find((s) => s.id === sheetId)
    if (!sheet) return doc
    const rule = sheet.automations.find((a) => a.id === ruleId)
    if (rule) rule.enabled = enabled
    const sheetIdx = doc.sheets.findIndex((s) => s.id === sheetId)
    doc.sheets[sheetIdx] = runSheetAutomations(sheet)
    return doc
  }

  function sheetStats(sheet: SpreadsheetSheet, template: SpreadsheetTemplate) {
    const statusCol = sheet.columns.find((c) => c.name === 'Status' || c.name === 'Review')?.id

    if (template === 'semester') {
      const gradeCol = sheet.columns.find((c) => c.name === 'Grade %')?.id
      const creditsCol = sheet.columns.find((c) => c.name === 'Credits')?.id
      const excellent = statusCol
        ? sheet.rows.filter((r) => String(r.cells[statusCol]) === 'Excellent').length
        : 0
      if (gradeCol && creditsCol) {
        return { gpa: computeWeightedGpa(sheet.rows, gradeCol, creditsCol), excellent, rows: sheet.rows.length }
      }
    }
    if (template === 'study_budget') {
      const planned = sheet.columns.find((c) => c.name === 'Planned (min)')?.id
      const actual = sheet.columns.find((c) => c.name === 'Actual (min)')?.id
      if (planned && actual) {
        const p = sheet.rows.reduce((s, r) => s + Number(r.cells[planned] ?? 0), 0)
        const a = sheet.rows.reduce((s, r) => s + Number(r.cells[actual] ?? 0), 0)
        return { planned: p, actual: a, delta: a - p }
      }
    }
    const overdue = sheet.rows.filter((r) =>
      Object.values(r.cells).some((v) => String(v).toLowerCase() === 'overdue' || String(v) === 'Due')
    ).length
    return { overdue }
  }

  function taskSyncsForSheet(sheet: SpreadsheetSheet, rowId?: string) {
    return collectTaskSyncs(sheet, rowId)
  }

  async function deleteSpreadsheet(id: string) {
    const { error } = await supabase.from('spreadsheets').delete().eq('id', id)
    if (error) throw error
    spreadsheets.value = spreadsheets.value.filter((s) => s.id !== id)
  }

  return {
    spreadsheets,
    loading,
    sorted,
    fetchSpreadsheets,
    getById,
    createSpreadsheet,
    saveDoc,
    getActiveSheet,
    updateCell,
    addRow,
    deleteRow,
    toggleAutomation,
    sheetStats,
    taskSyncsForSheet,
    deleteSpreadsheet,
  }
})
