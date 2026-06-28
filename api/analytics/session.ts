export const config = { runtime: 'edge' }

import { resolveCaptureUserId } from '../_lib/capture/auth'
import { logStudySession } from '../_lib/capture/apply'
import { errorResponse, json } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const userId = await resolveCaptureUserId(request)
  if (userId instanceof Response) return userId

  try {
    const body = (await request.json()) as {
      topic?: string
      duration_mins?: number
      project_id?: string | null
      session_type?: string
    }

    const topic = body.topic?.trim()
    const duration_mins = body.duration_mins
    if (!topic) return errorResponse('topic required', 400)
    if (!duration_mins || duration_mins < 1) return errorResponse('duration_mins required', 400)

    const session = await logStudySession(userId, {
      topic,
      duration_mins,
      project_id: body.project_id,
      session_type: body.session_type ?? 'focus',
      source: 'shortcut',
    })

    return json({ ok: true, session })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Session log failed', 500)
  }
}
