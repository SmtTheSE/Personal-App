import { serviceFetch } from '../integrations'
import type { TelegramCommand } from './parse'

async function nextTaskSortOrder(userId: string): Promise<number> {
  const res = await serviceFetch(
    `/rest/v1/tasks?user_id=eq.${userId}&select=sort_order&order=sort_order.desc&limit=1`
  )
  if (!res.ok) return 0
  const rows = (await res.json()) as { sort_order: number }[]
  return (rows[0]?.sort_order ?? -1) + 1
}

export async function applyCapture(
  userId: string,
  command: Extract<TelegramCommand, { type: 'task' } | { type: 'note' }>
): Promise<string> {
  if (command.type === 'task') {
    const sort_order = await nextTaskSortOrder(userId)
    const res = await serviceFetch('/rest/v1/tasks', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        title: command.title,
        description: null,
        priority: 'medium',
        status: 'todo',
        due_date: command.due_date,
        project_id: null,
        sort_order,
        source: 'telegram',
        external_ref: { provider: 'telegram' },
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      throw new Error(`Failed to create task: ${detail}`)
    }
    const due = command.due_date ? `\nDue: ${command.due_date}` : ''
    return `✅ Task added: <b>${escapeHtml(command.title)}</b>${due}`
  }

  const res = await serviceFetch('/rest/v1/notes', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      title: command.title,
      content: command.content,
      project_id: null,
      resource_id: null,
      tags: ['telegram'],
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`Failed to create note: ${detail}`)
  }
  return `📝 Note saved: <b>${escapeHtml(command.title)}</b>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}
