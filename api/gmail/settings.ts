export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { getIntegration, deleteIntegration, upsertIntegration } from '../_lib/integrations'
import { errorResponse, json } from '../_lib/http'

export default async function handler(request: Request): Promise<Response> {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    if (request.method === 'GET') {
      const row = await getIntegration(user.id, 'gmail')
      const meta = row?.metadata ?? {}
      const connected = !!row?.access_token
      const lastSync = meta.last_sync as { imported?: number; skipped?: number; errors?: string[] } | undefined
      return json({
        connected,
        email: (meta.email as string) ?? null,
        label_name: (meta.label_name as string) ?? 'nexus/task',
        connected_at: meta.connected_at ?? null,
        last_sync_at: meta.last_sync_at ?? null,
        last_sync: lastSync ?? null,
      })
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as { label_name?: string }
      const existing = await getIntegration(user.id, 'gmail')
      if (!existing) return errorResponse('Gmail not connected', 400)

      const metadata = { ...(existing.metadata ?? {}) }
      if (body.label_name) metadata.label_name = body.label_name

      await upsertIntegration(user.id, 'gmail', {
        access_token: existing.access_token,
        refresh_token: existing.refresh_token,
        metadata,
      })
      return json({ ok: true, label_name: metadata.label_name })
    }

    if (request.method === 'DELETE') {
      await deleteIntegration(user.id, 'gmail')
      return json({ ok: true })
    }

    return errorResponse('Method not allowed', 405)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Gmail settings failed', 500)
  }
}
