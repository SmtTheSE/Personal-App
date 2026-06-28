import { applyCapture } from './capture.js'
import type { TelegramCommand } from './parse.js'
import { handleDeployCommand, handleDoneCommand, handleStatusCommand, buildDailyDigest, handleTimezoneCommand } from './commands.js'
import { handleGmailCommand } from './gmail.js'
import { buildTodayPlanShare } from './planShare.js'
import { createPlanViewerInvite } from './viewers.js'

export async function dispatchTelegramCommand(userId: string, command: TelegramCommand): Promise<string> {
  switch (command.type) {
    case 'help':
      return ''
    case 'status':
      return handleStatusCommand(userId)
    case 'done':
      return handleDoneCommand(userId, command.query)
    case 'deploy':
      return handleDeployCommand(userId)
    case 'plan':
      return buildTodayPlanShare(userId)
    case 'share_plan': {
      const invite = await createPlanViewerInvite(userId)
      return [
        '<b>Share your today plan</b>',
        '',
        'Send this link to someone — they can only use <b>plan</b>:',
        `<code>${invite.link_url}</code>`,
        '',
        `<i>Expires ${invite.expires_at.split('T')[0]}</i>`,
      ].join('\n')
    }
    case 'digest':
      return buildDailyDigest(userId)
    case 'timezone':
      return handleTimezoneCommand(userId, command.query)
    case 'gmail':
      return handleGmailCommand(userId, command.query)
    case 'task':
    case 'note':
      return applyCapture(userId, command)
    case 'unknown':
      return 'Unknown command. Send <b>help</b> for examples.'
    default:
      return 'Unknown command. Send <b>help</b> for examples.'
  }
}
