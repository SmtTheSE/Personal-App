export function formatDateYmd(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseDueHint(text: string): { title: string; due_date: string | null } {
  const tomorrow = /\s+tomorrow$/i
  const today = /\s+today$/i

  if (tomorrow.test(text)) {
    const title = text.replace(tomorrow, '').trim()
    const due = new Date()
    due.setDate(due.getDate() + 1)
    return { title, due_date: formatDateYmd(due) }
  }

  if (today.test(text)) {
    const title = text.replace(today, '').trim()
    return { title, due_date: formatDateYmd(new Date()) }
  }

  const iso = text.match(/\s+(\d{4}-\d{2}-\d{2})$/)
  if (iso) {
    return { title: text.slice(0, -iso[0].length).trim(), due_date: iso[1] }
  }

  return { title: text.trim(), due_date: null }
}

/** Parse due date from email subject line patterns like "Buy milk [2026-07-01]" or "due 2026-07-01" */
export function parseDueFromSubject(subject: string): { title: string; due_date: string | null } {
  const bracket = subject.match(/^(.+?)\s*\[(\d{4}-\d{2}-\d{2})\]\s*$/)
  if (bracket) return { title: bracket[1].trim(), due_date: bracket[2] }

  const duePrefix = subject.match(/^(.+?)\s+due\s+(\d{4}-\d{2}-\d{2})\s*$/i)
  if (duePrefix) return { title: duePrefix[1].trim(), due_date: duePrefix[2] }

  return parseDueHint(subject)
}

export function inferCaptureKind(text: string, defaultKind: 'task' | 'note' = 'task'): 'task' | 'note' {
  const lower = text.toLowerCase()
  if (lower.startsWith('note:') || lower.startsWith('[note]')) return 'note'
  if (lower.startsWith('task:') || lower.startsWith('[task]')) return 'task'
  return defaultKind
}

export function stripCapturePrefix(text: string): string {
  return text.replace(/^\[(task|note)\]\s*/i, '').replace(/^(task|note):\s*/i, '').trim()
}
