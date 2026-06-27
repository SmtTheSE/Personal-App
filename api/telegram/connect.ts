export const config = { runtime: 'edge' }

import { requireUser } from '../_lib/auth'
import { json, errorResponse } from '../_lib/http'
import { getBotUsername } from '../_lib/telegram/bot'
import { createTelegramLink } from '../_lib/telegram/link'

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') return errorResponse('Method not allowed', 405)

  const user = await requireUser(request)
  if (user instanceof Response) return user

  try {
    const [{ link_code }, bot_username] = await Promise.all([
      createTelegramLink(user.id),
      getBotUsername(),
    ])
    const link_url = `https://t.me/${bot_username}?start=${link_code}`
    return json({ bot_username, link_code, link_url })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Telegram connect failed', 500)
  }
}
