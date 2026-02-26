import { Events } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'
import type { BotManager } from '~/core/BotManager'

class RawEvent extends BotEvent {
  name = Events.Raw

  async execute(bot: BotClient, _manager: BotManager, data: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bot.lavalink.sendRawData(data as any)
  }
}

export default new RawEvent()
