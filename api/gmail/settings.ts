export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { getIntegration, deleteIntegration, upsertIntegration } from '../_lib/integrations.js'
import { DEFAULT_ALERT_KEYWORDS, parseGmailAlertSettings } from '../_lib/gmail/client.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    if (request.method === 'GET') {
      const row = await getIntegration(user.id, 'gmail')
      const meta = row?.metadata ?? {}
      const alerts = parseGmailAlertSettings(meta)
      const connected = !!row?.access_token
      const lastSync = meta.last_sync as { imported?: number; skipped?: number; errors?: string[] } | undefined
      const lastAlertStats = meta.last_alert_stats as { notified?: number; checked?: number } | undefined
      return json({
        connected,
        email: (meta.email as string) ?? null,
        label_name: (meta.label_name as string) ?? 'nexus/task',
        connected_at: meta.connected_at ?? null,
        last_sync_at: meta.last_sync_at ?? null,
        last_sync: lastSync ?? null,
        alert_enabled: alerts.alert_enabled,
        alert_keywords: alerts.alert_keywords,
        last_alert_check_at: alerts.last_alert_check_at,
        last_alert_stats: lastAlertStats ?? null,
      })
    }

    if (request.method === 'POST') {
      const body = (await request.json()) as {
        label_name?: string
        alert_enabled?: boolean
        alert_keywords?: string[]
      }
      const existing = await getIntegration(user.id, 'gmail')
      if (!existing) return errorResponse('Gmail not connected', 400)

      const metadata = { ...(existing.metadata ?? {}) }
      if (body.label_name) metadata.label_name = body.label_name
      if (typeof body.alert_enabled === 'boolean') metadata.alert_enabled = body.alert_enabled
      if (Array.isArray(body.alert_keywords)) {
        const cleaned = body.alert_keywords
          .map((k) => (typeof k === 'string' ? k.trim() : ''))
          .filter(Boolean)
        metadata.alert_keywords = cleaned.length ? cleaned : DEFAULT_ALERT_KEYWORDS
      }

      await upsertIntegration(user.id, 'gmail', {
        access_token: existing.access_token,
        refresh_token: existing.refresh_token,
        metadata,
      })

      const alerts = parseGmailAlertSettings(metadata)
      return json({
        ok: true,
        label_name: metadata.label_name,
        alert_enabled: alerts.alert_enabled,
        alert_keywords: alerts.alert_keywords,
      })
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
