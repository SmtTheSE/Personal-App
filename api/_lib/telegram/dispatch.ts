import { applyCapture } from './capture.js'
import type { TelegramCommand } from './parse.js'
import { handleDeployCommand, handleDoneCommand, handleStatusCommand, buildDailyDigest, handleTimezoneCommand } from './commands.js'
import { handleGmailCommand } from './gmail.js'

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
