/**
 * @file playerReconnect.ts
 * @description Event handler for when a player successfully reconnects to a voice channel.
 */
import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerReconnect' event.
 */
class PlayerReconnectEvent extends LavalinkEvent {
  name = 'playerReconnect'

  /**
   * Logs the reconnection and sends a confirmation message to the guild's text channel.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {string} voiceChannelId - The ID of the reconnected voice channel.
   */
  async execute(bot: BotClient, player: Player, voiceChannelId: string): Promise<void> {
    logger.info(`[Player: ${player.guildId}] Reconnected to voice channel ${voiceChannelId}`)
    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_CONGRATULATION} **${bot.user?.displayName || 'tớ'}** đã kết nối lại thành công.`
      )
    )

    await channel
      .send({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Player: ${player.guildId}] Error reconnecting:`, e)
        return null
      })
  }
}

export default new PlayerReconnectEvent()
