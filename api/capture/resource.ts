export const config = { runtime: 'edge' }

import { resolveCaptureUserId } from '../_lib/capture/auth'
import { captureResource, captureTask, captureNote } from '../_lib/capture/apply'
import { inferCaptureKind, parseDueHint, stripCapturePrefix } from '../_lib/capture/parseDate'
import { errorResponse, json } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const userId = await resolveCaptureUserId(request)
  if (userId instanceof Response) return userId

  try {
    const body = (await request.json()) as {
      type?: 'task' | 'note' | 'resource' | 'auto'
      title?: string
      url?: string
      content?: string
      due_date?: string | null
      project_id?: string | null
      notes?: string
    }

    const rawTitle = body.title?.trim()
    if (!rawTitle && !body.url) return errorResponse('title or url required', 400)

    const kind =
      body.type === 'auto' || !body.type
        ? body.url
          ? 'resource'
          : inferCaptureKind(rawTitle ?? '', 'task')
        : body.type

    if (kind === 'resource') {
      if (!body.url) return errorResponse('url required for resource capture', 400)
      const resource = await captureResource(userId, {
        title: rawTitle || body.url,
        url: body.url,
        project_id: body.project_id,
        notes: body.notes ?? body.content ?? null,
        source: 'shortcut',
      })
      return json({ ok: true, type: 'resource', resource })
    }

    if (kind === 'note') {
      const title = stripCapturePrefix(rawTitle ?? 'Untitled note')
      const note = await captureNote(userId, {
        title,
        content: body.content ?? null,
        project_id: body.project_id,
        tags: ['shortcut'],
        source: 'shortcut',
      })
      return json({ ok: true, type: 'note', note })
    }

    const parsed = body.due_date
      ? { title: stripCapturePrefix(rawTitle ?? 'Untitled task'), due_date: body.due_date }
      : parseDueHint(stripCapturePrefix(rawTitle ?? 'Untitled task'))

    const task = await captureTask(userId, {
      title: parsed.title,
      due_date: parsed.due_date,
      description: body.content ?? null,
      project_id: body.project_id,
      source: 'shortcut',
      external_ref: { provider: 'shortcut' },
    })
    return json({ ok: true, type: 'task', task })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Capture failed', 500)
  }
}
