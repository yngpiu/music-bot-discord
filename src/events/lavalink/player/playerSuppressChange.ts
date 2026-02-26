/**
 * @file playerSuppressChange.ts
 * @description Event handler for when the bot's suppression status (e.g., in a Stage channel) changes.
 */
import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'playerSuppressChange' event.
 */
class PlayerSuppressChangeEvent extends LavalinkEvent {
  name = 'playerSuppressChange'

  /**
   * Automatically pauses playback when suppressed and resumes when unsuppressed.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {boolean} suppress - Whether the bot is currently suppressed.
   */
  async execute(bot: BotClient, player: Player, suppress: boolean) {
    logger.info(`[Player: ${player.guildId}] Suppress change: ${suppress}`)

    if (suppress) {
      // Pause if we are moved to audience in a stage channel.
      player.set('paused_of_servermute', true)
      if (!player.paused) await player.pause()
    } else {
      // Resume if we are invited to speak.
      if (player.get('paused_of_servermute')) {
        if (player.paused) await player.resume()
        player.set('paused_of_servermute', false)
      }
    }

    if (player.get('ignore_voice_state')) return

    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

    const message = suppress
      ? `${EMOJI.ANIMATED_CAT_CRYING} **${bot.user?.displayName || 'tớ'}** đã bị đuổi khỏi sân khấu, không thể tiếp tục phát nhạc.`
      : `${EMOJI.ANIMATED_CAT_LOVE_YOU} **${bot.user?.displayName || 'tớ'}** đã được bế lên sân khấu để phát nhạc.`

    const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

    await channel
      .send({
        components: [container],
        flags: ['IsComponentsV2']
      })

      .catch((e) => {
        logger.warn(`[Player: ${player.guildId}] Error sending suppress change notification:`, e)
        return null
      })
  }
}

export default new PlayerSuppressChangeEvent()
