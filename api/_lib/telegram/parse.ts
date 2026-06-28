export type TelegramCommand =
  | { type: 'help' }
  | { type: 'task'; title: string; due_date: string | null }
  | { type: 'note'; title: string; content: string | null }
  | { type: 'status' }
  | { type: 'done'; query: string }
  | { type: 'deploy' }
  | { type: 'plan' }
  | { type: 'share_plan' }
  | { type: 'digest' }
  | { type: 'timezone'; query: string }
  | { type: 'gmail'; query: string }
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

export function parseTelegramMessage(raw: string): TelegramCommand {
  const text = raw.trim()
  if (!text) return { type: 'help' }

  const lower = text.toLowerCase()
  if (lower === '/help' || lower === 'help') return { type: 'help' }

  if (lower === 'status' || lower === '/status') return { type: 'status' }
  if (lower === 'deploy' || lower === '/deploy') return { type: 'deploy' }
  if (lower === 'plan' || lower === '/plan') return { type: 'plan' }
  if (lower === 'share plan' || lower === '/shareplan' || lower === 'invite plan') return { type: 'share_plan' }
  if (lower === 'digest' || lower === '/digest') return { type: 'digest' }

  const timezoneMatch = text.match(/^(?:\/timezone|timezone)\s*(.*)$/i)
  if (timezoneMatch) return { type: 'timezone', query: timezoneMatch[1].trim() }

  const gmailMatch = text.match(/^(?:\/gmail|gmail|\/mail|mail)(?:\s+(.*))?$/i)
  if (gmailMatch) return { type: 'gmail', query: (gmailMatch[1] ?? '').trim() }

  const doneMatch = text.match(/^(?:\/done|done)\s+(.+)$/i)
  if (doneMatch) return { type: 'done', query: doneMatch[1].trim() }

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
  '<b>note</b> Lecture recap | Key ideas',
  '<b>status</b> — open tasks & streak',
  '<b>plan</b> — today\'s schedule (tasks, study, exams)',
  '<b>share plan</b> — invite link so someone can view your plan only',
  '<b>digest</b> — full daily summary with streak',
  '<b>timezone</b> Asia/Bangkok — set local time for greetings',
  '<b>gmail</b> — recent school inbox (SBS mail)',
  '<b>gmail 1</b> — read full email #1 from the list',
  '<b>gmail check</b> — refresh inbox &amp; check for new alerts',
  '<b>done</b> buy milk — mark task done',
  '<b>deploy</b> — latest Vercel deploy',
  '',
  'Aliases: <code>t</code> / <code>n</code>',
].join('\n')

/** @deprecated use parseTelegramMessage */
export const parseCaptureMessage = parseTelegramMessage
