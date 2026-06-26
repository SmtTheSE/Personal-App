export async function getIntegrationToken(
  userId: string,
  provider: 'github' | 'vercel'
): Promise<string | null> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('Server misconfigured: SUPABASE_SERVICE_ROLE_KEY required')
  }

  const url = new URL(`${supabaseUrl}/rest/v1/user_integrations`)
  url.searchParams.set('user_id', `eq.${userId}`)
  url.searchParams.set('provider', `eq.${provider}`)
  url.searchParams.set('select', 'access_token')
  url.searchParams.set('limit', '1')

  const res = await fetch(url.toString(), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to load integration: ${text}`)
  }

  const rows = (await res.json()) as { access_token: string }[]
  return rows[0]?.access_token ?? null
}

export async function hasIntegration(
  userId: string,
  provider: 'github' | 'vercel'
): Promise<boolean> {
  const token = await getIntegrationToken(userId, provider)
  return !!token
}
