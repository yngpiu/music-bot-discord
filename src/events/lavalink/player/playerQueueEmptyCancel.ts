import { EmbedBuilder, TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerQueueEmptyCancel'

export const execute = async (bot: BotClient, player: Player) => {
  logger.info(`[Lavalink: Player] ${player.guildId} :: QUEUE EMPTY CANCEL ::`)

  const channel = bot.channels.cache.get(player.textChannelId!)
  const msgId = player.get<string | null>('queueEmptyMessageId')

  if (!channel?.isTextBased() || !('messages' in channel) || !msgId) return

  try {
    const msg = await (channel as TextChannel).messages.fetch(msgId)
    if (msg?.editable) {
      const embed = new EmbedBuilder()
        .setColor('Green')
        .setDescription(`Có nhạc mới! Đã hủy đếm ngược ngắt kết nối.`)
      await msg.edit({ embeds: [embed] })
    }
  } catch (error) {
    logger.error(`Failed to update playerQueueEmptyStart message: ${error}`)
  }
}
