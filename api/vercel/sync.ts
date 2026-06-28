export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { syncVercelDeployFailures } from '../_lib/vercel/deploySync.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const stats = await syncVercelDeployFailures(user.id)
    return json(stats)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Deploy sync failed', 500)
  }
}
