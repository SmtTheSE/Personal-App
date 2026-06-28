import { serviceFetch, getIntegrationToken } from '../integrations'
import { logStudySession } from '../capture/apply'

interface CommitDay {
  date: string
  count: number
  repos: string[]
}

async function fetchRecentCommits(token: string, since: string): Promise<CommitDay[]> {
  const res = await fetch(
    `https://api.github.com/user/events?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  )
  if (!res.ok) return []

  const events = (await res.json()) as Array<{
    type: string
    created_at: string
    repo?: { name: string }
  }>

  const map = new Map<string, { count: number; repos: Set<string> }>()
  for (const event of events) {
    if (event.type !== 'PushEvent') continue
    if (event.created_at < since) continue
    const day = event.created_at.split('T')[0]
    const entry = map.get(day) ?? { count: 0, repos: new Set<string>() }
    entry.count++
    if (event.repo?.name) entry.repos.add(event.repo.name)
    map.set(day, entry)
  }

  return [...map.entries()].map(([date, v]) => ({
    date,
    count: v.count,
    repos: [...v.repos],
  }))
}

export async function syncGitHubActivitySessions(userId: string, projectId?: string | null) {
  const token = await getIntegrationToken(userId, 'github')
  if (!token) return { created: 0, skipped: 0 }

  const since = new Date(Date.now() - 7 * 86400000).toISOString()
  const days = await fetchRecentCommits(token, since)
  let created = 0
  let skipped = 0

  for (const day of days) {
    const dedupeKey = `github_activity:${day.date}:${day.repos.join(',')}`
    const existing = await serviceFetch(
      `/rest/v1/study_sessions?user_id=eq.${userId}&source=eq.github_activity&external_ref->>dedupe_key=eq.${encodeURIComponent(dedupeKey)}&select=id&limit=1`
    )
    if (existing.ok && ((await existing.json()) as unknown[]).length) {
      skipped++
      continue
    }

    const mins = Math.min(240, Math.max(30, day.count * 15))
    const topic = day.repos.length === 1
      ? `Built on ${day.repos[0]}`
      : `GitHub activity (${day.repos.length} repos)`

    await logStudySession(userId, {
      topic,
      duration_mins: mins,
      project_id: projectId ?? null,
      session_type: 'focus',
      source: 'github_activity',
      external_ref: { dedupe_key: dedupeKey, repos: day.repos, push_count: day.count },
    })
    created++
  }

  return { created, skipped }
}
