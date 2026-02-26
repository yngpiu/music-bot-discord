/**
 * @file playerQueueEmptyEnd.ts
 * @description Event handler for when the bot actually leaves the voice channel after the queue-empty timer expires.
 */
import { ContainerBuilder, TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerQueueEmptyEnd' event.
 */
class PlayerQueueEmptyEndEvent extends LavalinkEvent {
  name = 'playerQueueEmptyEnd'

  /**
   * Deletes the timer notification and sends a final goodbye message.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   */
  async execute(bot: BotClient, player: Player): Promise<void> {
    logger.info(`[Player: ${player.guildId}] No new tracks, leaving channel`)

    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const msgId = player.get('queueEmptyMessageId')

    if (msgId) {
      try {
        const msg = await (channel as TextChannel).messages.fetch(msgId as string)
        if (msg?.deletable) {
          await msg.delete()
        }
        const container = new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent(
            `${EMOJI.ANIMATED_CAT_BYE} Không thấy yêu cầu nào nữa, **${bot.user?.displayName || 'tớ'}** đã rời đi.`
          )
        )
        await channel.send({
          components: [container],
          flags: ['IsComponentsV2']
        })
      } catch (e) {
        logger.warn(`[Player: ${player.guildId}] Error deleting queueEmptyMessageId message:`, e)
      }
    }
  }
}

export default new PlayerQueueEmptyEndEvent()
