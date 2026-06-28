export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { deleteIntegration } from '../_lib/integrations.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    await deleteIntegration(user.id, 'telegram')
    return json({ ok: true })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Disconnect failed', 500)
  }
}
