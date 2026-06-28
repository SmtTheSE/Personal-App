import { serviceFetch, getIntegration, getIntegrationToken } from '../integrations'
import { digestGreeting, resolveTimezone } from './greeting'

interface TaskRow {
  id: string
  title: string
  status: string
  due_date: string | null
}

interface ExamRow {
  title: string
  exam_at: string
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function fetchPendingTasks(userId: string): Promise<TaskRow[]> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&status=neq.done&select=id,title,status,due_date&order=due_date.asc.nullslast&limit=5`
  )
  if (!res.ok) return []
  return res.json()
}

async function fetchNextExam(userId: string): Promise<ExamRow | null> {
  const now = new Date().toISOString()
  const res = await serviceFetch(
    `/rest/v1/exams?user_id=eq.${userId}&exam_at=gte.${now}&select=title,exam_at&order=exam_at.asc&limit=1`
  )
  if (!res.ok) return null
  const rows = (await res.json()) as ExamRow[]
  return rows[0] ?? null
}

async function fetchStudyStreak(userId: string): Promise<number> {
  const res = await serviceFetch(
    `/rest/v1/study_sessions?user_id=eq.${userId}&select=started_at&order=started_at.desc&limit=60`
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { started_at: string }[]
  if (!rows.length) return 0

  const days = new Set(rows.map((r) => r.started_at.split('T')[0]))
  let streak = 0
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  while (true) {
    const key = cursor.toISOString().split('T')[0]
    if (!days.has(key)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export async function handleStatusCommand(userId: string): Promise<string> {
  const [tasks, exam, streak] = await Promise.all([
    fetchPendingTasks(userId),
    fetchNextExam(userId),
    fetchStudyStreak(userId),
  ])

  const lines = ['<b>Nexus status</b>', '', `🔥 Streak: ${streak} day(s)`]
  if (exam) {
    lines.push(`📅 Next exam: ${escapeHtml(exam.title)} (${exam.exam_at.split('T')[0]})`)
  }
  lines.push('', '<b>Top open tasks</b>')
  if (!tasks.length) {
    lines.push('• None — nice work!')
  } else {
    for (const task of tasks) {
      const due = task.due_date ? ` · due ${task.due_date.split('T')[0]}` : ''
      lines.push(`• ${escapeHtml(task.title)}${due}`)
    }
  }
  return lines.join('\n')
}

export async function handleDoneCommand(userId: string, query: string): Promise<string> {
  const needle = query.trim().toLowerCase()
  if (!needle) return 'Usage: <code>done buy milk</code>'

  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&status=neq.done&select=id,title&limit=20`
  )
  if (!res.ok) return 'Could not load tasks.'
  const tasks = (await res.json()) as { id: string; title: string }[]
  const match =
    tasks.find((t) => t.title.toLowerCase() === needle) ??
    tasks.find((t) => t.title.toLowerCase().includes(needle))

  if (!match) return `No open task matching "${escapeHtml(query)}".`

  const patch = await serviceFetch(`/rest/v1/tasks?id=eq.${match.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      status: 'done',
      kanban_column: 'done',
      completed_at: new Date().toISOString(),
    }),
  })
  if (!patch.ok) return 'Failed to mark task done.'

  return `✅ Done: <b>${escapeHtml(match.title)}</b>`
}

export async function handleDeployCommand(userId: string): Promise<string> {
  const vercelToken = await getIntegrationToken(userId, 'vercel')
  if (!vercelToken) return 'Connect Vercel in Nexus Settings first.'

  const res = await fetch('https://api.vercel.com/v6/deployments?limit=5', {
    headers: { Authorization: `Bearer ${vercelToken}` },
  })
  if (!res.ok) return 'Could not fetch Vercel deployments.'

  const body = (await res.json()) as {
    deployments?: Array<{ name: string; state: string; url: string | null; created: number }>
  }
  const latest = body.deployments?.[0]
  if (!latest) return 'No recent deployments found.'

  const when = new Date(latest.created).toISOString().replace('T', ' ').slice(0, 16)
  const url = latest.url ? `\nhttps://${latest.url}` : ''
  return `<b>${escapeHtml(latest.name)}</b>\nState: ${latest.state}\n${when}${url}`
}

export async function buildDailyDigest(userId: string): Promise<string> {
  const integration = await getIntegration(userId, 'telegram')
  const timezone = resolveTimezone(integration?.metadata ?? {})
  const { label, emoji } = digestGreeting(timezone)
  const status = await handleStatusCommand(userId)
  return [`${emoji} <b>${label} — Nexus digest</b>`, '', status].join('\n')
}
