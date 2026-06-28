import { serviceFetch } from '../integrations.js'
import { dispatchNotification } from './hub.js'
import { checkGmailAlerts } from '../gmail/alertService.js'

function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60)
}

async function fetchUpcomingExams(userId: string) {
  const now = new Date().toISOString()
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const res = await serviceFetch(
    `/rest/v1/exams?user_id=eq.${userId}&exam_at=gte.${now}&exam_at=lte.${in48h}&select=id,title,exam_at`
  )
  if (!res.ok) return []
  return res.json() as Promise<{ id: string; title: string; exam_at: string }[]>
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

async function fetchPendingPRReviews(userId: string) {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&kanban_column=eq.review&status=neq.done&select=id,title&limit=20`
  )
  if (!res.ok) return []
  return res.json() as Promise<{ id: string; title: string }[]>
}

export async function runNotificationChecks(userId: string) {
  const sent: string[] = []

  const exams = await fetchUpcomingExams(userId)
  for (const exam of exams) {
    const h = hoursUntil(exam.exam_at)
    if (h > 0 && h <= 24) {
      const date = exam.exam_at.split('T')[0]
      const r = await dispatchNotification(userId, {
        event_type: 'exam_reminder',
        title: 'Exam tomorrow',
        body: `${exam.title} on ${date}`,
        dedupe_key: `exam:${exam.id}:${date}`,
        telegram_html: `📅 <b>Exam in 24h</b>\n${exam.title}\n${date}`,
        payload: { exam_id: exam.id },
      })
      if (r.in_app || r.telegram || r.web_push) sent.push(`exam:${exam.id}`)
    }
  }

  const streak = await fetchStudyStreak(userId)
  const today = new Date().toISOString().split('T')[0]
  const todayRes = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&completed_at=gte.${today}T00:00:00&select=id&limit=1`
  )
  const completedToday = todayRes.ok && ((await todayRes.json()) as unknown[]).length > 0
  const hour = new Date().getHours()
  if (streak >= 3 && !completedToday && hour >= 18) {
    const r = await dispatchNotification(userId, {
      event_type: 'streak_at_risk',
      title: 'Streak at risk',
      body: `${streak}-day streak — complete a task before midnight`,
      dedupe_key: `streak:${today}`,
      telegram_html: `🔥 <b>Streak at risk</b>\n${streak} day(s) — finish a task today!`,
      payload: { streak },
    })
    if (r.in_app || r.telegram || r.web_push) sent.push('streak')
  }

  const prs = await fetchPendingPRReviews(userId)
  if (prs.length >= 3) {
    const r = await dispatchNotification(userId, {
      event_type: 'pr_review_requested',
      title: `${prs.length} PRs awaiting review`,
      body: prs.slice(0, 3).map((p) => p.title).join(', '),
      dedupe_key: `pr_review:${today}:${prs.length}`,
      telegram_html: `👀 <b>${prs.length} PRs in review</b>\n${prs.slice(0, 3).map((p) => `• ${p.title}`).join('\n')}`,
      payload: { count: prs.length },
    })
    if (r.in_app || r.telegram || r.web_push) sent.push('pr_review')
  }

  const gmailAlerts = await checkGmailAlerts(userId)
  if (!('skipped' in gmailAlerts) && gmailAlerts.notified > 0) {
    sent.push(`gmail:${gmailAlerts.notified}`)
  }

  return { sent, streak, exam_count: exams.length, pr_count: prs.length, gmail_alerts: gmailAlerts }
}
