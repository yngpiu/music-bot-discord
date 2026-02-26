/**
 * @file playerDestroy.ts
 * @description Event handler for when a Lavalink player is destroyed. Notification is sent to the text channel.
 */
import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerDestroy' event.
 */
class PlayerDestroyEvent extends LavalinkEvent {
  name = 'playerDestroy'

  /**
   * Logs the destruction and sends a goodbye message to the server's text channel.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The destroyed player.
   * @param {string} [reason] - The reason for destruction.
   */
  async execute(bot: BotClient, player: Player, reason?: string): Promise<void> {
    logger.warn(`[Player: ${player.guildId}] Player destroyed. Reason: ${reason || 'Unknown'}`)
    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(`${EMOJI.ANIMATED_CAT_BYE} **${bot.user?.displayName || 'tớ'}** đã rời đi.`)
    )

    await channel
      .send({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Player: ${player.guildId}] Error sending destroy notification:`, e)
        return null
      })
  }
}

export default new PlayerDestroyEvent()
