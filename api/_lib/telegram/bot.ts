const TELEGRAM_API = 'https://api.telegram.org'

function botToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN required')
  return token
}

export async function telegramRequest<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = (await res.json()) as { ok: boolean; result?: T; description?: string }
  if (!data.ok) {
    throw new Error(data.description ?? `Telegram API ${method} failed`)
  }
  return data.result as T
}

export async function sendTelegramMessage(chatId: number | string, text: string, options?: { silent?: boolean }) {
  return telegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    disable_notification: options?.silent === true,
  })
}

export async function getBotUsername(): Promise<string> {
  const cached = process.env.TELEGRAM_BOT_USERNAME
  if (cached) return cached.replace(/^@/, '')
  const me = await telegramRequest<{ username?: string }>('getMe')
  if (!me.username) throw new Error('Telegram bot has no username')
  return me.username
}

export function verifyWebhookSecret(request: Request): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!expected) return true
  return request.headers.get('X-Telegram-Bot-Api-Secret-Token') === expected
}
