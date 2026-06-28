export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { serviceFetch } from '../_lib/integrations'
import { errorResponse, json } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    if (request.method === 'GET') {
      const res = await serviceFetch(
        `/rest/v1/push_subscriptions?user_id=eq.${user.id}&select=id,endpoint,created_at`
      )
      if (!res.ok) throw new Error(await res.text())
      return json({
        subscriptions: await res.json(),
        vapid_public_key: process.env.VAPID_PUBLIC_KEY ?? null,
      })
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }
      if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
        return errorResponse('Invalid subscription payload', 400)
      }

      await serviceFetch('/rest/v1/push_subscriptions', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          user_id: user.id,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          user_agent: request.headers.get('user-agent'),
        }),
      })
      return json({ ok: true })
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url)
      const endpoint = url.searchParams.get('endpoint')
      if (!endpoint) return errorResponse('endpoint required', 400)
      await serviceFetch(
        `/rest/v1/push_subscriptions?user_id=eq.${user.id}&endpoint=eq.${encodeURIComponent(endpoint)}`,
        { method: 'DELETE' }
      )
      return json({ ok: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Push subscribe failed', 500)
  }
}
