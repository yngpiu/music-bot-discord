// Event handler for when a player successfully reconnects to a voice channel.
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerReconnect' event.
class PlayerReconnectEvent extends LavalinkEvent {
  name = 'playerReconnect'

  // Logs the reconnection and sends a confirmation message to the guild's text channel.
  async execute(bot: BotClient, player: Player, voiceChannelId: string): Promise<void> {
    logger.info(`[Player: ${player.guildId}] Reconnected to voice channel ${voiceChannelId}`)

    const channel = bot.channels.cache.get(player.textChannelId!)

    const message = `${EMOJI.ANIMATED_CAT_CONGRATULATION} ${getBotName(bot)} đã kết nối lại thành công.`

    await sendContainerMessage(channel, message)
  }
}

export default new PlayerReconnectEvent()
