import { Events } from 'discord.js'

import type { BotClient } from '~/core/BotClient'

import { logger } from '~/utils/logger.js'

export default {
  name: Events.ClientReady,
  once: true,
  async execute(bot: BotClient) {
    await bot.lavalink.init({ ...bot.user!, shards: 'auto' })
    logger.info(`[System] Bot ${bot.user?.tag} is ready and successfully initialized Lavalink!`)
  }
}
