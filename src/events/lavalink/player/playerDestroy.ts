import { EmbedBuilder, TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerDestroy'

export const execute = async (bot: BotClient, player: Player, reason?: string) => {
  logger.info(`[Lavalink: Player] ${player.guildId} :: DESTROYED :: Reason: ${reason}`)

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  // We just need the channel to send the embed, no need to import from lib/embeds
  // unless we're using a specific build function

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('❌ Player Destroyed')
    .setDescription(`Reason: ${reason || 'Unknown'}`)
    .setTimestamp()

  await (channel as TextChannel).send({ embeds: [embed] }).catch(() => null)
}
