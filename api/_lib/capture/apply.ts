import { serviceFetch } from '../integrations'
import type { TaskSource } from '../tasks/source'
import { parseDueHint } from './parseDate'

export interface CaptureTaskInput {
  title: string
  due_date?: string | null
  description?: string | null
  priority?: 'low' | 'medium' | 'high'
  project_id?: string | null
  source: TaskSource | 'gmail' | 'shortcut'
  external_ref?: Record<string, unknown>
}

export interface CaptureNoteInput {
  title: string
  content?: string | null
  project_id?: string | null
  tags?: string[]
  source?: string
}

export interface CaptureResourceInput {
  title: string
  url: string
  type?: string
  project_id?: string | null
  notes?: string | null
  source?: string
}

async function nextTaskSortOrder(userId: string): Promise<number> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&select=sort_order&order=sort_order.desc&limit=1`
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { sort_order: number }[]
  return (rows[0]?.sort_order ?? -1) + 1
}

export async function captureTask(userId: string, input: CaptureTaskInput) {
  const sort_order = await nextTaskSortOrder(userId)
  const res = await serviceFetch('/rest/v1/tasks', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'medium',
      status: 'todo',
      due_date: input.due_date ?? null,
      project_id: input.project_id ?? null,
      sort_order,
      source: input.source,
      external_ref: input.external_ref ?? { provider: input.source },
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as { id: string; title: string; due_date: string | null }[]
  return rows[0]
}

export async function captureNote(userId: string, input: CaptureNoteInput) {
  const res = await serviceFetch('/rest/v1/notes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      title: input.title,
      content: input.content ?? null,
      project_id: input.project_id ?? null,
      resource_id: null,
      tags: input.tags ?? [],
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as { id: string; title: string }[]
  return rows[0]
}

export async function captureResource(userId: string, input: CaptureResourceInput) {
  const res = await serviceFetch('/rest/v1/resources', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      title: input.title,
      url: input.url,
      type: input.type ?? 'link',
      project_id: input.project_id ?? null,
      notes: input.notes ?? null,
      source: input.source ?? 'shortcut',
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as { id: string; title: string; url: string }[]
  return rows[0]
}

export function parseTaskFromText(raw: string, source: TaskSource | 'gmail' | 'shortcut') {
  const { title, due_date } = parseDueHint(raw.trim())
  return { title, due_date, source }
}

export async function logStudySession(
  userId: string,
  input: {
    topic: string
    duration_mins: number
    project_id?: string | null
    session_type?: string
    source?: string
    external_ref?: Record<string, unknown>
  }
) {
  const res = await serviceFetch('/rest/v1/study_sessions', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      topic: input.topic,
      duration_mins: input.duration_mins,
      project_id: input.project_id ?? null,
      session_type: input.session_type ?? 'focus',
      source: input.source ?? 'shortcut',
      external_ref: input.external_ref ?? null,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const rows = (await res.json()) as { id: string }[]
  return rows[0]
}
