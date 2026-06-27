export const config = { runtime: 'edge' }

import { requireUser } from '../../_lib/auth'
import {
  deleteSyncedEntity,
  fullCalendarSync,
  syncExam,
  syncTask,
  type CalendarEntityType,
} from '../../_lib/google/syncService'
import { errorResponse, json } from '../../_lib/http'

interface SyncBody {
  action?: 'full' | 'upsert' | 'delete'
  entity_type?: CalendarEntityType
  entity_id?: string
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const body = (await request.json().catch(() => ({}))) as SyncBody
    const action = body.action ?? 'upsert'

    if (action === 'full') {
      const result = await fullCalendarSync(user.id)
      return json(result)
    }

    if (!body.entity_type || !body.entity_id) {
      return errorResponse('entity_type and entity_id required', 400)
    }

    if (action === 'delete') {
      await deleteSyncedEntity(user.id, body.entity_type, body.entity_id)
      return json({ deleted: true })
    }

    const result =
      body.entity_type === 'task'
        ? await syncTask(user.id, body.entity_id)
        : await syncExam(user.id, body.entity_id)

    return json(result)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Sync failed', 500)
  }
}
