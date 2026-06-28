import { captureNote, captureTask } from '../capture/apply'
import type { TelegramCommand } from './parse'

export async function applyCapture(
  userId: string,
  command: Extract<TelegramCommand, { type: 'task' } | { type: 'note' }>
): Promise<string> {
  if (command.type === 'task') {
    const task = await captureTask(userId, {
      title: command.title,
      due_date: command.due_date,
      source: 'telegram',
      external_ref: { provider: 'telegram' },
    })
    const due = task.due_date ? `\nDue: ${task.due_date}` : ''
    return `✅ Task added: <b>${escapeHtml(task.title)}</b>${due}`
  }

  const note = await captureNote(userId, {
    title: command.title,
    content: command.content,
    tags: ['telegram'],
    source: 'telegram',
  })
  return `📝 Note saved: <b>${escapeHtml(note.title)}</b>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
