import { getIntegration, upsertIntegration, serviceFetch } from '../integrations.js'
import { getBotUsername } from './bot.js'
import { generateLinkCode } from './link.js'

const VIEWER_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface PlanViewer {
  chat_id: number
  first_name: string | null
  username: string | null
  linked_at: string
}

function parseViewers(metadata: Record<string, unknown>): PlanViewer[] {
  const raw = metadata.plan_viewers
  if (!Array.isArray(raw)) return []
  return raw.filter(
    (v): v is PlanViewer =>
      !!v &&
      typeof v === 'object' &&
      typeof (v as PlanViewer).chat_id === 'number'
  )
}

export async function createPlanViewerInvite(userId: string): Promise<{ code: string; link_url: string; expires_at: string }> {
  const existing = await getIntegration(userId, 'telegram')
  if (!existing?.access_token || existing.access_token === 'pending' || existing.metadata?.linked === false) {
    throw new Error('Connect Telegram first')
  }

  const code = generateLinkCode()
  const expires_at = new Date(Date.now() + VIEWER_CODE_TTL_MS).toISOString()
  const metadata = {
    ...(existing.metadata ?? {}),
    plan_viewer_code: code,
    plan_viewer_code_expires: expires_at,
  }

  await upsertIntegration(userId, 'telegram', {
    access_token: existing.access_token,
    refresh_token: existing.refresh_token,
    metadata,
  })

  const bot_username = await getBotUsername()
  return {
    code,
    link_url: `https://t.me/${bot_username}?start=plan_${code}`,
    expires_at,
  }
}

export async function findOwnerUserIdByPlanViewerCode(code: string): Promise<string | null> {
  const res = await serviceFetch(
    `/rest/v1/user_integrations?provider=eq.telegram&metadata->>plan_viewer_code=eq.${encodeURIComponent(code)}&select=user_id,metadata&limit=1`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { user_id: string; metadata: { plan_viewer_code_expires?: string } }[]
  const row = rows[0]
  if (!row) return null
  const expires = row.metadata?.plan_viewer_code_expires
  if (expires && Date.now() > new Date(expires).getTime()) return null
  return row.user_id
}

export async function addPlanViewer(
  ownerUserId: string,
  viewerChatId: number,
  from?: { username?: string; first_name?: string }
): Promise<void> {
  const existing = await getIntegration(ownerUserId, 'telegram')
  if (!existing) throw new Error('Owner Telegram not connected')

  const viewers = parseViewers(existing.metadata ?? {})
  if (!viewers.some((v) => v.chat_id === viewerChatId)) {
    viewers.push({
      chat_id: viewerChatId,
      first_name: from?.first_name ?? null,
      username: from?.username ?? null,
      linked_at: new Date().toISOString(),
    })
  }

  await upsertIntegration(ownerUserId, 'telegram', {
    access_token: existing.access_token,
    refresh_token: existing.refresh_token,
    metadata: {
      ...(existing.metadata ?? {}),
      plan_viewers: viewers,
    },
  })
}

export async function findOwnerUserIdByViewerChatId(viewerChatId: number): Promise<string | null> {
  const res = await serviceFetch(
    `/rest/v1/user_integrations?provider=eq.telegram&select=user_id,metadata`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { user_id: string; metadata: Record<string, unknown> }[]
  for (const row of rows) {
    const viewers = parseViewers(row.metadata ?? {})
    if (viewers.some((v) => v.chat_id === viewerChatId)) {
      return row.user_id
    }
  }
  return null
}

export async function listPlanViewers(userId: string): Promise<PlanViewer[]> {
  const existing = await getIntegration(userId, 'telegram')
  if (!existing) return []
  return parseViewers(existing.metadata ?? {})
}

export async function removePlanViewer(ownerUserId: string, viewerChatId: number): Promise<void> {
  const existing = await getIntegration(ownerUserId, 'telegram')
  if (!existing) return
  const viewers = parseViewers(existing.metadata ?? {}).filter((v) => v.chat_id !== viewerChatId)
  await upsertIntegration(ownerUserId, 'telegram', {
    access_token: existing.access_token,
    refresh_token: existing.refresh_token,
    metadata: { ...(existing.metadata ?? {}), plan_viewers: viewers },
  })
}

export const VIEWER_HELP_TEXT = [
  '<b>Shared plan view</b>',
  '',
  'Send <b>plan</b> to see their schedule for today.',
  'Only the daily plan is shared — nothing else.',
].join('\n')
