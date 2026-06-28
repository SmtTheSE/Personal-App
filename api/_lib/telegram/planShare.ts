import { getIntegration, serviceFetch } from '../integrations.js'
import { digestGreeting, resolveTimePrefs } from './greeting.js'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function todayYmd(metadata: Record<string, unknown> | undefined): string {
  const prefs = resolveTimePrefs(metadata)
  const tz = prefs.timeZone ?? 'UTC'
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date())
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

interface TaskRow {
  title: string
  due_date: string | null
  priority: string
  kanban_column: string | null
}

interface ExamRow {
  title: string
  exam_at: string
}

export async function buildTodayPlanShare(ownerUserId: string): Promise<string> {
  const [telegram, profileRes, tasksRes, examsRes, studyRes] = await Promise.all([
    getIntegration(ownerUserId, 'telegram'),
    serviceFetch(`/rest/v1/profiles?id=eq.${ownerUserId}&select=username,study_goal_mins&limit=1`),
    serviceFetch(
      `/rest/v1/tasks?user_id=eq.${ownerUserId}&status=neq.done&select=title,due_date,priority,kanban_column&order=due_date.asc.nullslast&limit=40`
    ),
    serviceFetch(
      `/rest/v1/exams?user_id=eq.${ownerUserId}&select=title,exam_at&order=exam_at.asc&limit=10`
    ),
    serviceFetch(
      `/rest/v1/study_sessions?user_id=eq.${ownerUserId}&started_at=gte.${new Date().toISOString().split('T')[0]}T00:00:00&select=duration_mins,session_type`
    ),
  ])

  const meta = telegram?.metadata ?? {}
  const today = todayYmd(meta)
  const profiles = profileRes.ok ? ((await profileRes.json()) as { username: string; study_goal_mins: number }[]) : []
  const name = profiles[0]?.username ?? 'Student'
  const studyGoal = profiles[0]?.study_goal_mins ?? 120

  const allTasks = tasksRes.ok ? ((await tasksRes.json()) as TaskRow[]) : []
  const dueToday = allTasks.filter((t) => {
    if (!t.due_date) return false
    return t.due_date.split('T')[0] <= today
  })
  const noDueTop = allTasks.filter((t) => !t.due_date).slice(0, 3)

  const exams = examsRes.ok ? ((await examsRes.json()) as ExamRow[]) : []
  const examsToday = exams.filter((e) => e.exam_at.split('T')[0] === today)

  const sessions = studyRes.ok
    ? ((await studyRes.json()) as { duration_mins: number; session_type: string | null }[])
    : []
  const studyMins = sessions
    .filter((s) => (s.session_type ?? 'focus') === 'focus')
    .reduce((sum, s) => sum + s.duration_mins, 0)

  const { label, emoji } = digestGreeting(resolveTimePrefs(meta))
  const lines = [
    `${emoji} <b>${escapeHtml(name)}'s plan — ${today}</b>`,
    `<i>${label}</i>`,
    '',
    `📚 Study: ${studyMins} / ${studyGoal} min`,
  ]

  if (examsToday.length) {
    lines.push('', '<b>Exams today</b>')
    for (const exam of examsToday) {
      const time = exam.exam_at.split('T')[1]?.slice(0, 5) ?? ''
      lines.push(`• ${escapeHtml(exam.title)}${time ? ` · ${time}` : ''}`)
    }
  }

  lines.push('', '<b>Due today & overdue</b>')
  if (!dueToday.length) {
    lines.push('• Nothing due — light day')
  } else {
    for (const task of dueToday.slice(0, 8)) {
      const due = task.due_date?.split('T')[0]
      const overdue = due && due < today ? ' ⚠️' : ''
      const col = task.kanban_column === 'review' ? ' 👀' : ''
      lines.push(`• ${escapeHtml(task.title)}${overdue}${col}`)
    }
    if (dueToday.length > 8) lines.push(`… +${dueToday.length - 8} more`)
  }

  if (noDueTop.length) {
    lines.push('', '<b>Also on the list</b>')
    for (const task of noDueTop) {
      lines.push(`• ${escapeHtml(task.title)}`)
    }
  }

  return lines.join('\n')
}
