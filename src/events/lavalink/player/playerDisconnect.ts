// Event handler for when a player is forcibly disconnected from a voice channel.
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerDisconnect' event.
class PlayerDisconnectEvent extends LavalinkEvent {
  name = 'playerDisconnect'

  // Logs the disconnection and notifies the guild's text channel.
  async execute(bot: BotClient, player: Player, voiceChannelId: string): Promise<void> {
    logger.warn(`[Player: ${player.guildId}] Disconnected from voice channel ${voiceChannelId}`)
    const channel = bot.channels.cache.get(player.textChannelId!)

    await sendContainerMessage(
      channel,
      `${EMOJI.ANIMATED_CAT_CRYING} ${getBotName(bot)} đã bị ngắt kết nối.`
    )
  }
}

export default new PlayerDisconnectEvent()
