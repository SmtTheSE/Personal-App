import { errorResponse } from './http'

export interface AuthUser {
  id: string
  email?: string
}

export async function requireUser(request: Request): Promise<AuthUser | Response> {
  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return errorResponse('Missing authorization', 401)
  }

  const jwt = authorization.slice(7)
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return errorResponse('Server misconfigured: Supabase env missing', 503)
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: anonKey,
    },
  })

  if (!res.ok) {
    return errorResponse('Unauthorized', 401)
  }

  const body = await res.json()
  return body as AuthUser
}
