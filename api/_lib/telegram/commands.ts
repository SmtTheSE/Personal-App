import { serviceFetch, getIntegration, getIntegrationToken, upsertIntegration } from '../integrations.js'
import { digestGreeting, resolveTimePrefs } from './greeting.js'
import { mergeTelegramNotifications } from './notify.js'

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
    `/rest/v1/tasks?user_id=eq.${userId}&completed_at=not.is.null&select=completed_at&order=completed_at.desc&limit=365`
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { completed_at: string }[]
  if (!rows.length) return 0

  const completedDates = new Set(rows.map((row) => row.completed_at.split('T')[0]))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    const key = day.toISOString().split('T')[0]
    if (completedDates.has(key)) {
      streak++
    } else if (i > 0) {
      break
    }
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
  const prefs = resolveTimePrefs(integration?.metadata ?? {})
  const { label, emoji } = digestGreeting(prefs)
  const status = await handleStatusCommand(userId)
  return [`${emoji} <b>${label} — Nexus digest</b>`, '', status].join('\n')
}

export async function handleTimezoneCommand(
  userId: string,
  query: string
): Promise<string> {
  const integration = await getIntegration(userId, 'telegram')
  const existing = integration?.metadata ?? {}
  const trimmed = query.trim()

  if (!trimmed) {
    const prefs = resolveTimePrefs(existing)
    const tz = prefs.timeZone ?? 'not set'
    const offset =
      prefs.offsetMinutes !== null ? `${prefs.offsetMinutes} min` : 'not set'
    return [
      `<b>Timezone</b>`,
      `IANA: <code>${tz}</code>`,
      `Offset: <code>${offset}</code>`,
      '',
      'Set with: <code>timezone Asia/Bangkok</code>',
      'Or open Nexus in your browser once to auto-sync.',
    ].join('\n')
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed }).format(new Date())
  } catch {
    return `Unknown timezone <code>${trimmed}</code>. Example: <code>timezone America/New_York</code>`
  }

  if (!integration?.access_token || integration.access_token === 'pending') {
    return 'Telegram not connected.'
  }

  const metadata = mergeTelegramNotifications(existing, {})
  metadata.timezone = trimmed

  await upsertIntegration(userId, 'telegram', {
    access_token: integration.access_token,
    refresh_token: integration.refresh_token,
    metadata,
  })

  const { label, emoji } = digestGreeting({ timeZone: trimmed, offsetMinutes: null })
  return `${emoji} Timezone set to <code>${trimmed}</code>. Greeting preview: <b>${label}</b>`
}
