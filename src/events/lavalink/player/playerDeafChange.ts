/**
 * @file playerDeafChange.ts
 * @description Event handler for when the bot's deafen status changes in a voice channel.
 */
import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerDeafChange' event.
 */
class PlayerDeafChangeEvent extends LavalinkEvent {
  name = 'playerDeafChange'

  /**
   * Sends a notification message when the bot is deafened or undeafened by a server admin.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {boolean} selfDeaf - Whether the bot deafened itself.
   * @param {boolean} serverDeaf - Whether the bot was server-deafened.
   */
  async execute(bot: BotClient, player: Player, selfDeaf: boolean, serverDeaf: boolean) {
    // Ignore updates if the player is in an initialization or protected state.
    if (player.get('ignore_voice_state')) return

    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const message = serverDeaf
      ? `${EMOJI.ANIMATED_CAT_CRYING} **${bot.user?.displayName || 'tớ'}** đã bị ai đó bịt tai lại.`
      : `${EMOJI.ANIMATED_CAT_LOVE_YOU} **${bot.user?.displayName || 'tớ'}** đã có thể nghe được trở lại.`

    const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

    await channel
      .send({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Player: ${player.guildId}] Error sending server deaf change notification:`, e)
        return null
      })
  }
}

export default new PlayerDeafChangeEvent()
