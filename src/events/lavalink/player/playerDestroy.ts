// Event handler for when a Lavalink player is destroyed. Notification is sent to the text channel.
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerDestroy' event.
class PlayerDestroyEvent extends LavalinkEvent {
  name = 'playerDestroy'

  // Logs the destruction and sends a goodbye message to the server's text channel.
  async execute(bot: BotClient, player: Player, reason?: string): Promise<void> {
    logger.warn(`[Player: ${player.guildId}] Player destroyed. Reason: ${reason || 'Unknown'}`)

    const channel = bot.channels.cache.get(player.textChannelId!)

    await sendContainerMessage(channel, `${EMOJI.ANIMATED_CAT_BYE} ${getBotName(bot)} đã rời đi.`)
  }
}

export default new PlayerDestroyEvent()
