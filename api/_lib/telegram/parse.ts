export type CaptureCommand =
  | { type: 'task'; title: string; due_date: string | null }
  | { type: 'note'; title: string; content: string | null }
  | { type: 'help' }
  | { type: 'unknown'; text: string }

function formatDateYmd(date: Date) {
  return date.toISOString().split('T')[0]
}

function parseDueHint(text: string): { title: string; due_date: string | null } {
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

export function parseCaptureMessage(raw: string): CaptureCommand {
  const text = raw.trim()
  if (!text) return { type: 'help' }

  const lower = text.toLowerCase()
  if (lower === '/help' || lower === 'help' || lower === '/start') {
    return { type: 'help' }
  }

  const taskMatch = text.match(/^(?:\/task|task|\/t|t)\s+(.+)$/i)
  if (taskMatch) {
    const { title, due_date } = parseDueHint(taskMatch[1])
    if (!title) return { type: 'help' }
    return { type: 'task', title, due_date }
  }

  const noteMatch = text.match(/^(?:\/note|note|\/n|n)\s+(.+)$/is)
  if (noteMatch) {
    const body = noteMatch[1].trim()
    const pipe = body.indexOf('|')
    if (pipe !== -1) {
      const title = body.slice(0, pipe).trim()
      const content = body.slice(pipe + 1).trim()
      if (!title) return { type: 'help' }
      return { type: 'note', title, content: content || null }
    }
    if (!body) return { type: 'help' }
    return { type: 'note', title: body, content: null }
  }

  return { type: 'unknown', text }
}

export const HELP_TEXT = [
  '<b>Nexus quick capture</b>',
  '',
  '<b>task</b> Buy milk tomorrow',
  '<b>task</b> Submit lab 2026-06-30',
  '<b>note</b> LeetCode 347',
  '<b>note</b> Lecture recap | Key ideas from today',
  '',
  'Aliases: <code>t</code> / <code>n</code>',
  'Due hints: <code>today</code>, <code>tomorrow</code>, or <code>YYYY-MM-DD</code>',
].join('\n')
