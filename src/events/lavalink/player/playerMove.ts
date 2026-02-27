// Event handler for when the bot is moved between voice channels.
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerMove' event.
class PlayerMoveEvent extends LavalinkEvent {
  name = 'playerMove'

  // Logs the move and notifies the server's text channel about the new voice channel.
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

    await sendContainerMessage(
      channel,
      `${EMOJI.ANIMATED_CAT_NO_IDEA} ${getBotName(bot)} đã bị ai đó bê sang kênh <#${newVoiceChannelId}>.`
    )
  }
}

export default new PlayerMoveEvent()
