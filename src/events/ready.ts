import { Events } from 'discord.js'

import type { BotClient } from '~/core/BotClient'

import { logger } from '~/utils/logger.js'

export default {
  name: Events.ClientReady,
  once: true,
  async execute(bot: BotClient) {
    logger.info(
      `[Ready] Bot instance #${bot.botIndex + 1} is now online and active as "${bot.user?.tag}".`
    )
    await bot.lavalink.init({ ...bot.user!, shards: 'auto' })
  }
}
