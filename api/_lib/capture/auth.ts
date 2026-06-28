import { serviceFetch } from '../integrations.js'
import { requireUser } from '../auth.js'

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function generateCaptureToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24))
  const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `nxs_${raw}`
}

export async function hashCaptureToken(token: string): Promise<string> {
  return sha256(token)
}

export async function resolveCaptureUserId(request: Request): Promise<string | Response> {
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer nxs_')) {
    const token = authHeader.slice('Bearer '.length).trim()
    const token_hash = await hashCaptureToken(token)
    const res = await serviceFetch(
      `/rest/v1/capture_api_tokens?token_hash=eq.${token_hash}&select=user_id,token_prefix&limit=1`
    )
    if (!res.ok) return new Response(JSON.stringify({ error: 'Invalid capture token' }), { status: 401 })
    const rows = (await res.json()) as { user_id: string; token_prefix: string }[]
    const row = rows[0]
    if (!row) return new Response(JSON.stringify({ error: 'Invalid capture token' }), { status: 401 })

    void serviceFetch(`/rest/v1/capture_api_tokens?token_hash=eq.${token_hash}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ last_used_at: new Date().toISOString() }),
    })

    return row.user_id
  }

  const user = await requireUser(request)
  if (user instanceof Response) return user
  return user.id
}

export async function createCaptureToken(userId: string, label = 'Shortcuts') {
  const token = generateCaptureToken()
  const token_hash = await hashCaptureToken(token)
  const token_prefix = token.slice(0, 12)

  const res = await serviceFetch('/rest/v1/capture_api_tokens', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ user_id: userId, label, token_hash, token_prefix }),
  })
  if (!res.ok) throw new Error(await res.text())
  return { token, token_prefix, label }
}

export async function listCaptureTokens(userId: string) {
  const res = await serviceFetch(
    `/rest/v1/capture_api_tokens?user_id=eq.${userId}&select=id,label,token_prefix,last_used_at,created_at&order=created_at.desc`
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function revokeCaptureToken(userId: string, tokenId: string) {
  const res = await serviceFetch(
    `/rest/v1/capture_api_tokens?id=eq.${tokenId}&user_id=eq.${userId}`,
    { method: 'DELETE' }
  )
  if (!res.ok) throw new Error(await res.text())
}
