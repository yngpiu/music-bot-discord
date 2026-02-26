/**
 * @file raw.ts
 * @description Forwards raw Discord gateway events to Lavalink for voice state management.
 */
import { Events } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'
import type { BotManager } from '~/core/BotManager'

/**
 * Event handler for raw Discord data.
 */
class RawEvent extends BotEvent {
  name = Events.Raw

  /**
   * Forwards the raw data packet to the Lavalink client.
   * @param {BotClient} bot - The Discord client instance.
   * @param {BotManager} _manager - The bot manager.
   * @param {unknown} data - The raw event data from Discord.
   */
  async execute(bot: BotClient, _manager: BotManager, data: unknown): Promise<void> {
    bot.lavalink.sendRawData(data as any)
  }
}

export default new RawEvent()
