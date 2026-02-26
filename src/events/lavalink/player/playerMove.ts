/**
 * @file playerMove.ts
 * @description Event handler for when the bot is moved between voice channels.
 */
import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerMove' event.
 */
class PlayerMoveEvent extends LavalinkEvent {
  name = 'playerMove'

  /**
   * Logs the move and notifies the server's text channel about the new voice channel.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {string} oldVoiceChannelId - The ID of the previous voice channel.
   * @param {string} newVoiceChannelId - The ID of the current voice channel.
   */
  async execute(
    bot: BotClient,
    player: Player,
    oldVoiceChannelId: string,
    newVoiceChannelId: string
  ): Promise<void> {
    logger.info(
      `[Player: ${player.guildId}] Moved from ${oldVoiceChannelId} to ${newVoiceChannelId}`
    )
    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_NO_IDEA} Ai đó đã bê **${bot.user?.displayName || 'tớ'}** sang kênh <#${newVoiceChannelId}>.`
      )
    )

    await channel
      .send({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Player: ${player.guildId}] Error sending move notification:`, e)
        return null
      })
  }
}

export default new PlayerMoveEvent()
