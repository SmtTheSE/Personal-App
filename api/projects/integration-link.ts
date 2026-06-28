export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { serviceFetch } from '../_lib/integrations'
import { errorResponse, json } from '../_lib/http'

interface LinkBody {
  project_id: string
  provider: 'vercel' | 'github'
  external_id: string
  external_ref?: Record<string, unknown>
}

export default async function handler(request: Request): Promise<Response> {
  const user = await requireUser(request)
  if (user instanceof Response) return user

  if (request.method === 'GET') {
    try {
      const res = await serviceFetch(
        `/rest/v1/project_integration_links?user_id=eq.${user.id}&select=*`
      )
      if (!res.ok) throw new Error(await res.text())
      const links = await res.json()
      return json({ links })
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Failed to load links', 500)
    }
  }

  if (request.method === 'POST') {
    try {
      const body = (await request.json()) as LinkBody
      if (!body.project_id || !body.provider || !body.external_id) {
        return errorResponse('project_id, provider, and external_id required', 400)
      }

      const res = await serviceFetch(
        '/rest/v1/project_integration_links?on_conflict=project_id,provider',
        {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({
            user_id: user.id,
            project_id: body.project_id,
            provider: body.provider,
            external_id: body.external_id,
            external_ref: body.external_ref ?? {},
            updated_at: new Date().toISOString(),
          }),
        }
      )
      if (!res.ok) throw new Error(await res.text())
      const rows = await res.json()
      return json({ link: rows[0] ?? null })
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Failed to save link', 500)
    }
  }

  if (request.method === 'DELETE') {
    try {
      const url = new URL(request.url)
      const projectId = url.searchParams.get('project_id')
      const provider = url.searchParams.get('provider')
      if (!projectId || !provider) {
        return errorResponse('project_id and provider query params required', 400)
      }

      const res = await serviceFetch(
        `/rest/v1/project_integration_links?user_id=eq.${user.id}&project_id=eq.${projectId}&provider=eq.${provider}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error(await res.text())
      return json({ deleted: true })
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Failed to delete link', 500)
    }
  }

  return errorResponse('Method not allowed', 405)
}
