// Event handler for when the bot's mute status changes. Automatically pauses/resumes the player on server mute.
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerMuteChange' event.
class PlayerMuteChangeEvent extends LavalinkEvent {
  name = 'playerMuteChange'

  // Handles pausing/resuming logic and sends a notification message when the bot is muted or unmuted.
  async execute(
    bot: BotClient,
    player: Player,
    selfMuted: boolean,
    serverMuted: boolean
  ): Promise<void> {
    logger.info(`[Player: ${player.guildId}] Server mute change: ${serverMuted}`)

    // Automatically pause playback if server-muted by an admin.
    if (serverMuted) {
      player.set('paused_of_servermute', true)
      if (!player.paused) await player.pause()
    } else {
      // Automatically resume when unmuted if we were the ones who paused it.
      if (player.get('paused_of_servermute')) {
        if (player.paused) await player.resume()
        player.set('paused_of_servermute', false)
      }
    }

    if (player.get('ignore_voice_state')) return

    const channel = bot.channels.cache.get(player.textChannelId!)

    const message = serverMuted
      ? `${EMOJI.ANIMATED_CAT_CRYING} **${getBotName(bot)}** đã bị ai đó bịt miệng, không thể tiếp tục phát nhạc.`
      : `${EMOJI.ANIMATED_CAT_LOVE_YOU} **${getBotName(bot)}** đã nói lại được rồi, có thể tiếp tục phát nhạc.`

    await sendContainerMessage(channel, message)
  }
}

export default new PlayerMuteChangeEvent()
