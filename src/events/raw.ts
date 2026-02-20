import { Events } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import type { BotManager } from '~/core/BotManager'

export default {
  name: Events.Raw,
  async execute(bot: BotClient, _manager: BotManager, data: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bot.lavalink.sendRawData(data as any)
  }
}
