import { supabase } from '@/lib/supabase'
import type { CalendarEntityType, CalendarSyncAction, CalendarSyncResult } from '@/types/calendar'
import type { CalendarBusyBlock } from '@/types/calendar'

type QueuedOp = {
  action: CalendarSyncAction
  entity_type?: CalendarEntityType
  entity_id?: string
}

const queue = new Map<string, QueuedOp>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
const FLUSH_MS = 800

async function authHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeader()
  const res = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  return data as T
}

async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeader()
  const res = await fetch(path, { headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`)
  }
  return data as T
}

function scheduleFlush() {
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushQueue()
  }, FLUSH_MS)
}

async function flushQueue() {
  const ops = [...queue.values()]
  queue.clear()

  for (const op of ops) {
    try {
      if (op.action === 'full') {
        await apiPost<CalendarSyncResult>('/api/google/calendar/sync', { action: 'full' })
      } else if (op.entity_type && op.entity_id) {
        await apiPost('/api/google/calendar/sync', {
          action: op.action,
          entity_type: op.entity_type,
          entity_id: op.entity_id,
        })
      }
    } catch {
      // Non-blocking: planner works without calendar sync
    }
  }
}

export function enqueueCalendarSync(
  action: CalendarSyncAction,
  entityType?: CalendarEntityType,
  entityId?: string
) {
  const key =
    action === 'full'
      ? 'full'
      : `${action}:${entityType}:${entityId}`

  queue.set(key, {
    action,
    entity_type: entityType,
    entity_id: entityId,
  })
  scheduleFlush()
}

export async function requestFullCalendarSync() {
  return apiPost<CalendarSyncResult>('/api/google/calendar/sync', { action: 'full' })
}

export async function fetchBusyBlocks(timeMin: string, timeMax: string) {
  const params = new URLSearchParams({ timeMin, timeMax })
  const data = await apiGet<{ blocks: CalendarBusyBlock[] }>(`/api/google/calendar/busy?${params}`)
  return data.blocks
}
