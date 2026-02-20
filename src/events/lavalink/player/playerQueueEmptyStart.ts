import { EmbedBuilder, TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerQueueEmptyStart'

export const execute = async (bot: BotClient, player: Player, delayMs: number) => {
  logger.info(`[Lavalink: Player] ${player.guildId} :: QUEUE EMPTY START ::`)

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const embed = new EmbedBuilder()
    .setColor('Yellow')
    .setTitle('Đã hết nhạc 🎵')
    .setDescription(
      `Hàng chờ trống. Bot sẽ tự ngắt kết nối trong <t:${Math.round((Date.now() + delayMs) / 1000)}:R>`
    )

  player.set('queueEmptyMessageId', null)

  try {
    const msg = await (channel as TextChannel).send({ embeds: [embed] })
    player.set('queueEmptyMessageId', msg.id)
  } catch (error) {
    logger.error(`Failed to send playerQueueEmptyStart message: ${error}`)
  }
}
