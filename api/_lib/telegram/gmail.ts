import { checkGmailAlerts, listRecentSchoolEmails, type GmailRecentEmail } from '../gmail/alertService.js'
import { escapeHtml, truncateText } from '../gmail/client.js'
import { getIntegration } from '../integrations.js'

function senderLabel(from: string): string {
  const match = from.match(/^(.+?)\s*<[^>]+>$/)
  return match?.[1]?.replace(/^"|"$/g, '').trim() || from
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatGmailList(emails: GmailRecentEmail[]): string {
  const lines = ['<b>📬 Recent school mail</b>', '']
  emails.forEach((email, i) => {
    lines.push(`<b>${i + 1}.</b> ${escapeHtml(email.subject)}`)
    lines.push(`${escapeHtml(senderLabel(email.from))} · ${formatDate(email.received_at)}`)
    lines.push(`<i>${escapeHtml(truncateText(email.body || email.snippet, 120))}</i>`)
    lines.push('')
  })
  lines.push('Send <b>gmail 1</b> to read the full message.')
  return lines.join('\n')
}

function formatGmailDetail(email: GmailRecentEmail, num: number): string {
  const body = truncateText(email.body || email.snippet, 3200)
  return [
    `<b>📬 Email #${num}</b>`,
    '',
    `<b>Subject:</b> ${escapeHtml(email.subject)}`,
    `<b>From:</b> ${escapeHtml(email.from)}`,
    `<b>Date:</b> ${formatDate(email.received_at)}`,
    '',
    escapeHtml(body),
  ].join('\n')
}

export async function handleGmailCommand(userId: string, query: string): Promise<string> {
  const integration = await getIntegration(userId, 'gmail')
  if (!integration?.access_token) {
    return 'Gmail not connected. Open <b>Nexus → Settings → Gmail capture</b> and tap Connect.'
  }

  const trimmed = query.trim().toLowerCase()

  if (trimmed === 'check' || trimmed === 'refresh') {
    const result = await checkGmailAlerts(userId)
    if ('skipped' in result && result.skipped === 'not_connected') {
      return 'Gmail not connected.'
    }
    const recent = result.recent ?? []
    if (!recent.length) {
      return '📭 No matching school emails in inbox.'
    }
    const list = formatGmailList(recent.slice(0, 5))
    return `${list}\n\n<i>Checked · ${result.notified} new alert(s)</i>`
  }

  const readMatch = query.trim().match(/^(?:read\s+)?(\d+)$/i)
  if (readMatch) {
    const num = parseInt(readMatch[1], 10)
    const index = num - 1
    const emails = await listRecentSchoolEmails(userId, 10)
    if (index < 0 || index >= emails.length) {
      return `No email #${num}. Send <b>gmail</b> to see the list.`
    }
    return formatGmailDetail(emails[index], num)
  }

  const emails = await listRecentSchoolEmails(userId, 5)
  if (!emails.length) {
    return [
      '📭 No matching school emails found.',
      '',
      'Set keywords in <b>Settings → Gmail capture</b> (e.g. <code>@sbsedu.vn</code>).',
    ].join('\n')
  }

  return formatGmailList(emails)
}
