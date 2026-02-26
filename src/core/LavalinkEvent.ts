import type { BotClient } from '~/core/BotClient.js'

export abstract class LavalinkEvent {
  abstract name: string

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract execute(bot: BotClient, ...args: any[]): Promise<void>
}
