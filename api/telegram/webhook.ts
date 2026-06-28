export const config = { runtime: 'edge' }

import { json, errorResponse } from '../_lib/http.js'
import { sendTelegramMessage, verifyWebhookSecret } from '../_lib/telegram/bot.js'
import { dispatchTelegramCommand } from '../_lib/telegram/dispatch.js'
import {
  completeTelegramLink,
  findUserIdByChatId,
  findUserIdByLinkCode,
} from '../_lib/telegram/link.js'
import { HELP_TEXT, parseTelegramMessage } from '../_lib/telegram/parse.js'

interface TelegramUpdate {
  message?: {
    message_id: number
    text?: string
    chat: { id: number; type: string }
    from?: { id: number; username?: string; first_name?: string }
  }
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return errorResponse('Method not allowed', 405)
  if (!verifyWebhookSecret(request)) return errorResponse('Unauthorized', 401)

  let update: TelegramUpdate
  try {
    update = await request.json()
  } catch {
    return json({ ok: true })
  }

  const message = update.message
  if (!message?.text || !message.chat?.id) {
    return json({ ok: true })
  }

  const chatId = message.chat.id
  const text = message.text.trim()

  try {
  if (text.startsWith('/start')) {
    const code = text.split(/\s+/)[1]?.trim()
    if (!code) {
      await sendTelegramMessage(
        chatId,
        'Open <b>Nexus → Settings → Integrations → Telegram</b> and tap Connect to link this chat.'
      )
      return json({ ok: true })
    }

    const userId = await findUserIdByLinkCode(code)
    if (!userId) {
      await sendTelegramMessage(chatId, 'Link code expired or invalid. Generate a new one in Nexus Settings.')
      return json({ ok: true })
    }

    await completeTelegramLink(userId, chatId, message.from)
    await sendTelegramMessage(chatId, `✅ Connected to Nexus.\n\n${HELP_TEXT}`)
    return json({ ok: true })
  }

  const userId = await findUserIdByChatId(chatId)
  if (!userId) {
    await sendTelegramMessage(
      chatId,
      'This chat is not linked yet. Connect from <b>Nexus Settings → Telegram</b>.'
    )
    return json({ ok: true })
  }

  const command = parseTelegramMessage(text)
  if (command.type === 'help') {
    await sendTelegramMessage(chatId, HELP_TEXT)
    return json({ ok: true })
  }

  const reply = await dispatchTelegramCommand(userId, command)
  if (reply) await sendTelegramMessage(chatId, reply)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Something went wrong'
    await sendTelegramMessage(chatId, `⚠️ ${msg}`).catch(() => undefined)
  }

  return json({ ok: true })
}
