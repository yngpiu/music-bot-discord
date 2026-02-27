// Forwards raw Discord gateway events to Lavalink for voice state management.
import { Events } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'
import type { BotManager } from '~/core/BotManager'

// Event handler for raw Discord data.
class RawEvent extends BotEvent {
  name = Events.Raw

  // Forwards the raw data packet to the Lavalink client.
  async execute(bot: BotClient, _manager: BotManager, data: unknown): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bot.lavalink.sendRawData(data as any)
  }
}

export default new RawEvent()
