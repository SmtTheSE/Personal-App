export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { createCaptureToken, listCaptureTokens, revokeCaptureToken } from '../_lib/capture/auth.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    if (request.method === 'GET') {
      const tokens = await listCaptureTokens(user.id)
      return json({ tokens })
    }

    if (request.method === 'POST') {
      const body = (await request.json().catch(() => ({}))) as { label?: string }
      const created = await createCaptureToken(user.id, body.label ?? 'Shortcuts')
      return json({
        token: created.token,
        token_prefix: created.token_prefix,
        label: created.label,
        hint: 'Use Authorization: Bearer <token> for /api/capture/resource and /api/analytics/session',
      })
    }

    if (request.method === 'DELETE') {
      const url = new URL(request.url)
      const id = url.searchParams.get('id')
      if (!id) return errorResponse('id query param required', 400)
      await revokeCaptureToken(user.id, id)
      return json({ ok: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Token operation failed', 500)
  }
}
