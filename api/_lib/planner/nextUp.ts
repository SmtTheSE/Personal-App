import { serviceFetch } from '../integrations.js'

interface TaskRow {
  id: string
  title: string
  status: string
  priority: string
  due_date: string | null
  kanban_column: string | null
  source: string
}

interface ExamRow {
  id: string
  title: string
  exam_at: string
}

export interface NextUpResponse {
  greeting: string
  streak_days: number
  next_exam: { title: string; date: string; hours_until: number } | null
  top_tasks: { id: string; title: string; due_date: string | null; priority: string }[]
  pr_reviews_pending: number
  study_today_mins: number
  study_goal_mins: number
  suggestion: string
  spoken_summary: string
}

async function fetchStudyStreak(userId: string): Promise<number> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&completed_at=not.is.null&select=completed_at&order=completed_at.desc&limit=365`
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { completed_at: string }[]
  const completedDates = new Set(rows.map((r) => r.completed_at.split('T')[0]))
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)
    const key = day.toISOString().split('T')[0]
    if (completedDates.has(key)) streak++
    else if (i > 0) break
  }
  return streak
}

function taskScore(task: TaskRow): number {
  const map: Record<string, number> = { high: 3, medium: 2, low: 1 }
  let score = map[task.priority] ?? 2
  if (task.kanban_column === 'review') score += 2
  if (task.source === 'github_pr') score += 1.5
  if (task.due_date) {
    const days = (new Date(task.due_date).getTime() - Date.now()) / (86400000)
    if (days <= 1) score += 3
    else if (days <= 3) score += 1.5
  }
  return score
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export async function buildNextUp(userId: string): Promise<NextUpResponse> {
  const [tasksRes, examRes, prRes, studyRes, profileRes, streak] = await Promise.all([
    serviceFetch(
      `/rest/v1/tasks?user_id=eq.${userId}&status=neq.done&select=id,title,status,priority,due_date,kanban_column,source&limit=50`
    ),
    serviceFetch(
      `/rest/v1/exams?user_id=eq.${userId}&exam_at=gte.${new Date().toISOString()}&select=id,title,exam_at&order=exam_at.asc&limit=1`
    ),
    serviceFetch(
      `/rest/v1/tasks?user_id=eq.${userId}&kanban_column=eq.review&status=neq.done&select=id`
    ),
    serviceFetch(
      `/rest/v1/study_sessions?user_id=eq.${userId}&started_at=gte.${new Date().toISOString().split('T')[0]}T00:00:00&select=duration_mins,session_type`
    ),
    serviceFetch(`/rest/v1/profiles?id=eq.${userId}&select=study_goal_mins&limit=1`),
    fetchStudyStreak(userId),
  ])

  const tasks = tasksRes.ok ? ((await tasksRes.json()) as TaskRow[]) : []
  const exams = examRes.ok ? ((await examRes.json()) as ExamRow[]) : []
  const prs = prRes.ok ? ((await prRes.json()) as { id: string }[]) : []
  const sessions = studyRes.ok
    ? ((await studyRes.json()) as { duration_mins: number; session_type: string | null }[])
    : []
  const profiles = profileRes.ok ? ((await profileRes.json()) as { study_goal_mins: number }[]) : []

  const ranked = [...tasks].sort((a, b) => taskScore(b) - taskScore(a)).slice(0, 5)
  const studyToday = sessions
    .filter((s) => (s.session_type ?? 'focus') === 'focus')
    .reduce((sum, s) => sum + s.duration_mins, 0)
  const studyGoal = profiles[0]?.study_goal_mins ?? 120

  const nextExam = exams[0]
    ? {
        title: exams[0].title,
        date: exams[0].exam_at.split('T')[0],
        hours_until: (new Date(exams[0].exam_at).getTime() - Date.now()) / 3600000,
      }
    : null

  const hour = new Date().getHours()
  const greeting = greetingForHour(hour)

  let suggestion = ranked[0]?.title ?? 'Take a break — no open tasks'
  if (prs.length >= 3) suggestion = `Review ${prs.length} pull requests first`
  else if (nextExam && nextExam.hours_until <= 72) suggestion = `Study for ${nextExam.title}`
  else if (studyToday < studyGoal * 0.4) suggestion = `Log ${studyGoal - studyToday} more study minutes`

  const topTask = ranked[0]?.title ?? 'nothing urgent'
  const spoken = `${greeting}. Your top task is ${topTask}. Streak ${streak} days.`

  return {
    greeting,
    streak_days: streak,
    next_exam: nextExam,
    top_tasks: ranked.map((t) => ({
      id: t.id,
      title: t.title,
      due_date: t.due_date,
      priority: t.priority,
    })),
    pr_reviews_pending: prs.length,
    study_today_mins: studyToday,
    study_goal_mins: studyGoal,
    suggestion,
    spoken_summary: spoken,
  }
}
