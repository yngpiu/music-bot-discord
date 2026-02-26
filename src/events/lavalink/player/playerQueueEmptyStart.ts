/**
 * @file playerQueueEmptyStart.ts
 * @description Event handler for when the bot's queue becomes empty. Starts a countdown to leave the voice channel.
 */
import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerQueueEmptyStart' event.
 */
class PlayerQueueEmptyStartEvent extends LavalinkEvent {
  name = 'playerQueueEmptyStart'

  /**
   * Notifies the server about the upcoming departure and stores the message ID for later deletion.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {number} delayMs - The delay in milliseconds before the bot leaves.
   */
  async execute(bot: BotClient, player: Player, delayMs: number): Promise<void> {
    logger.info(
      `[Player: ${player.guildId}] Queue empty, starting timer to leave channel (${delayMs}ms)`
    )

    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    // Reset any existing message ID.
    player.set('queueEmptyMessageId', null)

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(`
      ${EMOJI.ANIMATED_CAT_CRYING} Hết nhạc rồi, **${bot.user?.displayName || 'tớ'}** sẽ rời đi trong <t:${Math.round((Date.now() + delayMs) / 1000)}:R> nếu không thấy yêu cầu nào.
    `)
    )

    try {
      const msg = await channel.send({
        components: [container],
        flags: ['IsComponentsV2']
      })
      player.set('queueEmptyMessageId', msg.id)
    } catch (e) {
      logger.warn(`[Player: ${player.guildId}] Error sending leave channel timer notification:`, e)
    }
  }
}

export default new PlayerQueueEmptyStartEvent()
