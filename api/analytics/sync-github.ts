export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth.js'
import { syncGitHubActivitySessions } from '../_lib/timeTracking/githubActivity.js'
import { errorResponse, json } from '../_lib/http.js'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  const url = new URL(request.url)
  const projectId = url.searchParams.get('project_id')

  try {
    const stats = await syncGitHubActivitySessions(user.id, projectId)
    return json(stats)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Time sync failed', 500)
  }
}
