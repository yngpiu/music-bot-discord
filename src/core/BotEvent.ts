import type { BotClient } from '~/core/BotClient.js'
import type { BotManager } from '~/core/BotManager.js'

export abstract class BotEvent {
  abstract name: string
  once?: boolean

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract execute(bot: BotClient, manager: BotManager, ...args: any[]): Promise<void>
}
