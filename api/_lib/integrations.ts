export type IntegrationProvider = 'github' | 'vercel' | 'google_calendar' | 'telegram' | 'gmail'

export interface IntegrationRecord {
  access_token: string
  refresh_token: string | null
  metadata: Record<string, unknown>
  updated_at: string
}

function supabaseConfig() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required')
  }
  return { supabaseUrl, serviceKey }
}

function restHeaders(serviceKey: string) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }
}

export async function getIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<IntegrationRecord | null> {
  const { supabaseUrl, serviceKey } = supabaseConfig()
  const url = new URL(`${supabaseUrl}/rest/v1/user_integrations`)
  url.searchParams.set('user_id', `eq.${userId}`)
  url.searchParams.set('provider', `eq.${provider}`)
  url.searchParams.set('select', 'access_token,refresh_token,metadata,updated_at')
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), { headers: restHeaders(serviceKey) })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to load integration: ${text}`)
  }

  const rows = (await res.json()) as IntegrationRecord[]
  return rows[0] ?? null
}

export async function getIntegrationToken(
  userId: string,
  provider: IntegrationProvider
): Promise<string | null> {
  const row = await getIntegration(userId, provider)
  return row?.access_token ?? null
}

export async function hasIntegration(
  userId: string,
  provider: IntegrationProvider
): Promise<boolean> {
  const token = await getIntegrationToken(userId, provider)
  return !!token
}

export async function upsertIntegration(
  userId: string,
  provider: IntegrationProvider,
  data: {
    access_token: string
    refresh_token?: string | null
    metadata?: Record<string, unknown>
  }
) {
  const { supabaseUrl, serviceKey } = supabaseConfig()
  const url = `${supabaseUrl}/rest/v1/user_integrations?on_conflict=user_id,provider`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...restHeaders(serviceKey),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      user_id: userId,
      provider,
      access_token: data.access_token,
      refresh_token: data.refresh_token ?? null,
      metadata: data.metadata ?? {},
      updated_at: new Date().toISOString(),
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    if (text.includes('user_integrations_provider_check') || text.includes('violates check constraint')) {
      throw new Error(
        'Database missing gmail provider — run supabase/migrations/v12_gmail_provider.sql in Supabase SQL editor'
      )
    }
    throw new Error(`Failed to save integration: ${text}`)
  }
}

export async function deleteIntegration(userId: string, provider: IntegrationProvider) {
  const { supabaseUrl, serviceKey } = supabaseConfig()
  const url = new URL(`${supabaseUrl}/rest/v1/user_integrations`)
  url.searchParams.set('user_id', `eq.${userId}`)
  url.searchParams.set('provider', `eq.${provider}`)

  const res = await fetch(url.toString(), {
    method: 'DELETE',
    headers: restHeaders(serviceKey),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to delete integration: ${text}`)
  }
}

export async function serviceFetch(path: string, init?: RequestInit) {
  const { supabaseUrl, serviceKey } = supabaseConfig()
  return fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      ...restHeaders(serviceKey),
      ...(init?.headers ?? {}),
    },
  })
}
