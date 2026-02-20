import { Player, Track } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { buildNowPlayingEmbed } from '~/lib/embeds'

import { logger } from '~/utils/logger.js'

export const name = 'trackStart'

export const execute = async (bot: BotClient, player: Player, track: Track) => {
  logger.debug(
    `[Lavalink:Player] Started playing track "${track.info?.title}" for Guild ${player.guildId}`
  )
  logger.info(track)

  if (!track) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  // Dynamic import to avoid circular dependencies if BotManager imports this file
  await (channel as import('discord.js').TextChannel).send(buildNowPlayingEmbed(track))
}
