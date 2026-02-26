import { Events } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'

import { logger } from '~/utils/logger.js'

class ReadyEvent extends BotEvent {
  name = Events.ClientReady
  once = true

  async execute(bot: BotClient) {
    await bot.lavalink.init({ ...bot.user!, shards: 'auto' })
    logger.info(`[System] Bot ${bot.user?.tag} is ready and successfully initialized Lavalink!`)
  }
}

export default new ReadyEvent()
