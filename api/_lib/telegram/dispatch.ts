import { applyCapture } from './capture'
import type { TelegramCommand } from './parse'
import { handleDeployCommand, handleDoneCommand, handleStatusCommand, buildDailyDigest } from './commands'

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
    case 'task':
    case 'note':
      return applyCapture(userId, command)
    case 'unknown':
      return 'Unknown command. Send <b>help</b> for examples.'
    default:
      return 'Unknown command. Send <b>help</b> for examples.'
  }
}
