import { getIntegration, upsertIntegration, serviceFetch } from '../integrations'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8
const CODE_TTL_MS = 15 * 60 * 1000

export function generateLinkCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('')
}

export async function createTelegramLink(userId: string) {
  const link_code = generateLinkCode()
  const link_expires = new Date(Date.now() + CODE_TTL_MS).toISOString()
  const metadata = {
    link_code,
    link_expires,
    linked: false,
  }

  const existing = await getIntegration(userId, 'telegram')
  if (existing?.access_token && existing.access_token !== 'pending') {
    await upsertIntegration(userId, 'telegram', {
      access_token: existing.access_token,
      refresh_token: existing.refresh_token,
      metadata: { ...(existing.metadata ?? {}), ...metadata },
    })
  } else {
    await upsertIntegration(userId, 'telegram', {
      access_token: 'pending',
      refresh_token: null,
      metadata,
    })
  }

  return { link_code, link_expires }
}

export async function findUserIdByLinkCode(code: string): Promise<string | null> {
  const res = await serviceFetch(
    `/rest/v1/user_integrations?provider=eq.telegram&metadata->>link_code=eq.${encodeURIComponent(code)}&select=user_id,metadata&limit=1`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { user_id: string; metadata: { link_expires?: string } }[]
  const row = rows[0]
  if (!row) return null
  const expires = row.metadata?.link_expires
  if (expires && Date.now() > new Date(expires).getTime()) return null
  return row.user_id
}

export async function completeTelegramLink(
  userId: string,
  chatId: number,
  from?: { username?: string; first_name?: string }
) {
  await upsertIntegration(userId, 'telegram', {
    access_token: String(chatId),
    refresh_token: null,
    metadata: {
      linked: true,
      username: from?.username ?? null,
      first_name: from?.first_name ?? null,
      linked_at: new Date().toISOString(),
      link_code: null,
      link_expires: null,
    },
  })
}

export async function findUserIdByChatId(chatId: number): Promise<string | null> {
  const res = await serviceFetch(
    `/rest/v1/user_integrations?provider=eq.telegram&access_token=eq.${chatId}&select=user_id,metadata&limit=1`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as { user_id: string; metadata?: { linked?: boolean } }[]
  const row = rows[0]
  if (!row || row.metadata?.linked === false) return null
  return row.user_id
}
