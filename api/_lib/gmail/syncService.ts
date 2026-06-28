import { getIntegration, upsertIntegration, serviceFetch } from '../integrations.js'
import { captureNote, captureTask } from '../capture/apply.js'
import {
  inferCaptureKind,
  parseDueFromSubject,
  stripCapturePrefix,
} from '../capture/parseDate.js'
import { getGmailAccessToken, gmailFetch, extractGmailBody } from './client.js'

async function hashContent(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

async function getAccessToken(userId: string): Promise<string | null> {
  return getGmailAccessToken(userId)
}

interface GmailPayload {
  mimeType?: string
  body?: { data?: string }
  parts?: GmailPayload[]
}

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload?: GmailPayload
}

async function fetchMapping(userId: string, messageId: string) {
  const res = await serviceFetch(
    `/rest/v1/gmail_message_sync_mappings?user_id=eq.${userId}&gmail_message_id=eq.${encodeURIComponent(messageId)}&select=id&limit=1`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { id: string }[]
  return rows[0] ?? null
}

async function upsertMapping(
  userId: string,
  messageId: string,
  entityType: 'task' | 'note',
  entityId: string,
  contentHash: string
) {
  await serviceFetch('/rest/v1/gmail_message_sync_mappings', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      gmail_message_id: messageId,
      entity_type: entityType,
      entity_id: entityId,
      content_hash: contentHash,
      last_synced_at: new Date().toISOString(),
    }),
  })
}

export async function syncGmailCapture(userId: string) {
  const accessToken = await getAccessToken(userId)
  if (!accessToken) throw new Error('Gmail not connected')

  const integration = await getIntegration(userId, 'gmail')
  const labelName = (integration?.metadata?.label_name as string) ?? 'nexus/task'

  const labels = (await gmailFetch(accessToken, '/labels')) as {
    labels?: { id: string; name: string }[]
  }
  const label = labels.labels?.find((l) => l.name.toLowerCase() === labelName.toLowerCase())
  if (!label) {
    return { imported: 0, skipped: 0, errors: [`Label "${labelName}" not found in Gmail`] }
  }

  const list = (await gmailFetch(
    accessToken,
    `/messages?labelIds=${label.id}&maxResults=20`
  )) as { messages?: { id: string }[] }

  const stats = { imported: 0, skipped: 0, errors: [] as string[] }

  for (const item of list.messages ?? []) {
    try {
      if (await fetchMapping(userId, item.id)) {
        stats.skipped++
        continue
      }

      const full = (await gmailFetch(
        accessToken,
        `/messages/${item.id}?format=full`
      )) as GmailMessage

      const headers = (full.payload as { headers?: { name: string; value: string }[] })?.headers ?? []
      const subject = headers.find((h) => h.name.toLowerCase() === 'subject')?.value ?? full.snippet
      const body = extractGmailBody(full.payload ?? {}) || full.snippet

      const kind = inferCaptureKind(subject, inferCaptureKind(body, 'task'))
      const parsed = parseDueFromSubject(stripCapturePrefix(subject))
      const contentHash = await hashContent(`${item.id}:${subject}:${body.slice(0, 200)}`)

      if (kind === 'note') {
        const note = await captureNote(userId, {
          title: parsed.title || 'Email note',
          content: body.trim() || null,
          tags: ['gmail'],
          source: 'gmail',
        })
        await upsertMapping(userId, item.id, 'note', note.id, contentHash)
      } else {
        const task = await captureTask(userId, {
          title: parsed.title || 'Email task',
          due_date: parsed.due_date,
          description: body.trim() || null,
          source: 'gmail',
          external_ref: { provider: 'gmail', message_id: item.id, thread_id: full.threadId },
        })
        await upsertMapping(userId, item.id, 'task', task.id, contentHash)
      }

      stats.imported++
    } catch (err) {
      stats.errors.push(`${item.id}: ${err instanceof Error ? err.message : 'import failed'}`)
    }
  }

  if (integration) {
    await upsertIntegration(userId, 'gmail', {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      metadata: {
        ...integration.metadata,
        last_sync_at: new Date().toISOString(),
        last_sync: stats,
      },
    })
  }

  return stats
}
