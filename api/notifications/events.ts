export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { serviceFetch } from '../_lib/integrations.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    if (request.method === 'GET') {
      const url = new URL(request.url)
      const unreadOnly = url.searchParams.get('unread') === 'true'
      const path = unreadOnly
        ? `/rest/v1/notification_events?user_id=eq.${user.id}&read_at=is.null&select=id,event_type,title,body,payload,created_at&order=created_at.desc&limit=50`
        : `/rest/v1/notification_events?user_id=eq.${user.id}&select=id,event_type,title,body,payload,read_at,created_at&order=created_at.desc&limit=50`
      const res = await serviceFetch(path)
      if (!res.ok) throw new Error(await res.text())
      return json({ events: await res.json() })
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as { id?: string; mark_all?: boolean }
      if (body.mark_all) {
        await serviceFetch(
          `/rest/v1/notification_events?user_id=eq.${user.id}&read_at=is.null`,
          {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ read_at: new Date().toISOString() }),
          }
        )
        return json({ ok: true })
      }
      if (!body.id) return errorResponse('id required', 400)
      await serviceFetch(
        `/rest/v1/notification_events?id=eq.${body.id}&user_id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ read_at: new Date().toISOString() }),
        }
      )
      return json({ ok: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Notifications failed', 500)
  }
}
