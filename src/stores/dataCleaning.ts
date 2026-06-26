import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  CleaningSession,
  CleaningView,
  DedupeStrategy,
} from '@/types/dataCleaning'
import { parseCleaningFile } from '@/lib/dataCleaning/parseImport'
import { profileColumns } from '@/lib/dataCleaning/profileColumns'
import {
  findDuplicateGroups,
  removeDuplicateRows,
  removeEmptyRows,
  trimWhitespace,
} from '@/lib/dataCleaning/dedupeRows'

const STORAGE_KEY = 'nexus-data-cleaning-sessions'

function newId() {
  return crypto.randomUUID()
}

function nowIso() {
  return new Date().toISOString()
}

function emptyStats(rowCount: number) {
  return {
    originalRowCount: rowCount,
    currentRowCount: rowCount,
    duplicateRowsRemoved: 0,
    whitespaceTrimmed: 0,
    emptyRowsRemoved: 0,
  }
}

function rebuildSession(
  session: CleaningSession,
  rows: CleaningSession['rows'],
  statsPatch: Partial<CleaningSession['stats']> = {}
): CleaningSession {
  const profiles = profileColumns(session.columns, rows)
  const duplicateGroups = findDuplicateGroups(rows, session.columns, session.dedupeKeyColumnIds)
  return {
    ...session,
    rows,
    profiles,
    duplicateGroups,
    stats: {
      ...session.stats,
      currentRowCount: rows.length,
      ...statsPatch,
    },
    updatedAt: nowIso(),
  }
}

export const useDataCleaningStore = defineStore('dataCleaning', () => {
  const sessions = ref<CleaningSession[]>([])
  const loaded = ref(false)

  const sorted = computed(() =>
    [...sessions.value].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  )

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
  }

  function loadFromStorage() {
    if (loaded.value) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) sessions.value = JSON.parse(raw) as CleaningSession[]
    } catch {
      sessions.value = []
    }
    loaded.value = true
  }

  function getById(id: string) {
    return sessions.value.find((s) => s.id === id) ?? null
  }

  async function importFile(file: File) {
    const parsed = await parseCleaningFile(file)
    const profiles = profileColumns(parsed.columns, parsed.rows)
    const dedupeKeyColumnIds = parsed.columns.map((c) => c.id)
    const duplicateGroups = findDuplicateGroups(parsed.rows, parsed.columns, dedupeKeyColumnIds)

    const session: CleaningSession = {
      id: newId(),
      title: parsed.title,
      sourceFilename: parsed.sourceFilename,
      sourceType: parsed.sourceType,
      sheetName: parsed.sheetName,
      columns: parsed.columns,
      rows: parsed.rows,
      profiles,
      duplicateGroups,
      dedupeKeyColumnIds,
      dedupeStrategy: 'first',
      activeView: 'profile',
      stats: emptyStats(parsed.rows.length),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    sessions.value = [session, ...sessions.value]
    persist()
    return session
  }

  function saveSession(session: CleaningSession) {
    const index = sessions.value.findIndex((s) => s.id === session.id)
    if (index === -1) return
    sessions.value[index] = { ...session, updatedAt: nowIso() }
    persist()
  }

  function setActiveView(id: string, view: CleaningView) {
    const session = getById(id)
    if (!session) return
    saveSession({ ...session, activeView: view })
  }

  function setDedupeKeys(id: string, columnIds: string[]) {
    const session = getById(id)
    if (!session) return
    const next = rebuildSession({ ...session, dedupeKeyColumnIds: columnIds }, session.rows)
    saveSession(next)
  }

  function setDedupeStrategy(id: string, strategy: DedupeStrategy) {
    const session = getById(id)
    if (!session) return
    saveSession({ ...session, dedupeStrategy: strategy })
  }

  function runAutoClean(id: string) {
    const session = getById(id)
    if (!session) return null

    let rows = session.rows
    let stats = { ...session.stats }

    const trimmed = trimWhitespace(rows, session.columns)
    rows = trimmed.rows
    stats.whitespaceTrimmed += trimmed.cellsTrimmed

    const noEmpty = removeEmptyRows(rows, session.columns)
    rows = noEmpty.rows
    stats.emptyRowsRemoved += noEmpty.removedCount

    const deduped = removeDuplicateRows(
      rows,
      session.columns,
      session.dedupeKeyColumnIds,
      session.dedupeStrategy
    )
    rows = deduped.rows
    stats.duplicateRowsRemoved += deduped.removedCount

    const next = rebuildSession(session, rows, stats)
    saveSession(next)
    return next
  }

  function removeDuplicates(id: string) {
    const session = getById(id)
    if (!session) return null

    const deduped = removeDuplicateRows(
      session.rows,
      session.columns,
      session.dedupeKeyColumnIds,
      session.dedupeStrategy
    )

    const next = rebuildSession(session, deduped.rows, {
      duplicateRowsRemoved: session.stats.duplicateRowsRemoved + deduped.removedCount,
    })
    saveSession(next)
    return next
  }

  function trimAllWhitespace(id: string) {
    const session = getById(id)
    if (!session) return null

    const result = trimWhitespace(session.rows, session.columns)
    const next = rebuildSession(session, result.rows, {
      whitespaceTrimmed: session.stats.whitespaceTrimmed + result.cellsTrimmed,
    })
    saveSession(next)
    return next
  }

  function removeEmpty(id: string) {
    const session = getById(id)
    if (!session) return null

    const result = removeEmptyRows(session.rows, session.columns)
    const next = rebuildSession(session, result.rows, {
      emptyRowsRemoved: session.stats.emptyRowsRemoved + result.removedCount,
    })
    saveSession(next)
    return next
  }

  function deleteSession(id: string) {
    sessions.value = sessions.value.filter((s) => s.id !== id)
    persist()
  }

  return {
    sessions,
    sorted,
    loaded,
    loadFromStorage,
    getById,
    importFile,
    saveSession,
    setActiveView,
    setDedupeKeys,
    setDedupeStrategy,
    runAutoClean,
    removeDuplicates,
    trimAllWhitespace,
    removeEmpty,
    deleteSession,
  }
})
