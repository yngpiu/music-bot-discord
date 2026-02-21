import { EmbedBuilder, TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'playerQueueEmptyEnd'

export const execute = async (bot: BotClient, player: Player) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: playerQueueEmptyEnd :: disconnecting`)

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const msgId = player.get('queueEmptyMessageId')

  if (msgId) {
    try {
      const msg = await (channel as TextChannel).messages.fetch(msgId as string)
      if (msg?.editable) {
        await msg.edit({
          embeds: [
            new EmbedBuilder()
              .setColor('Red')
              .setDescription(`Bot đã rời kênh do hết nhạc quá lâu.`)
          ]
        })
      }
    } catch (error) {
      logger.error(`Failed to edit queue empty message on end: ${error}`)
    }
  }
}
