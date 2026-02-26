/**
 * @file playerDisconnect.ts
 * @description Event handler for when a player is forcibly disconnected from a voice channel.
 */
import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerDisconnect' event.
 */
class PlayerDisconnectEvent extends LavalinkEvent {
  name = 'playerDisconnect'

  /**
   * Logs the disconnection and notifies the guild's text channel.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {string} voiceChannelId - The ID of the voice channel that was left.
   */
  async execute(bot: BotClient, player: Player, voiceChannelId: string): Promise<void> {
    logger.warn(`[Player: ${player.guildId}] Disconnected from voice channel ${voiceChannelId}`)
    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_CRYING} **${bot.user?.displayName || 'tớ'}** đã bị ngắt kết nối.`
      )
    )

    await channel
      .send({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Player: ${player.guildId}] Error sending disconnect notification:`, e)
        return null
      })
  }
}

export default new PlayerDisconnectEvent()
