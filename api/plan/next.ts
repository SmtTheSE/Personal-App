export const config = { runtime: 'edge' }

import { resolveCaptureUserId } from '../_lib/capture/auth.js'
import { buildNextUp } from '../_lib/planner/nextUp.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const userId = await resolveCaptureUserId(request)
  if (userId instanceof Response) return userId

  try {
    const next = await buildNextUp(userId)
    return json(next)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Plan lookup failed', 500)
  }
}
