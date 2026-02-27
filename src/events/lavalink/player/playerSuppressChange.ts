// Event handler for when the bot's suppression status (e.g., in a Stage channel) changes.
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerSuppressChange' event.
class PlayerSuppressChangeEvent extends LavalinkEvent {
  name = 'playerSuppressChange'

  // Automatically pauses playback when suppressed and resumes when unsuppressed.
  async execute(bot: BotClient, player: Player, suppress: boolean): Promise<void> {
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

    const message = suppress
      ? `${EMOJI.ANIMATED_CAT_CRYING} ${getBotName(bot)} đã bị đuổi khỏi sân khấu, không thể tiếp tục phát nhạc.`
      : `${EMOJI.ANIMATED_CAT_LOVE} ${getBotName(bot)} đã được bế lên sân khấu để phát nhạc.`

    await sendContainerMessage(channel, message)
  }
}

export default new PlayerSuppressChangeEvent()
