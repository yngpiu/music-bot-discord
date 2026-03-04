// Event handler for when a Lavalink player is destroyed. Notification is sent to the text channel.
import { TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'
import { LyricsManager } from '~/core/LyricsManager.js'

import { logger } from '~/utils/logger.js'
import { safeDeleteMessageNow, safeSendMessageWithContainer } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'playerDestroy' event.
class PlayerDestroyEvent extends LavalinkEvent {
  name = 'playerDestroy'

  // Logs the destruction and sends a goodbye message to the server's text channel.
  async execute(bot: BotClient, player: Player, reason?: string): Promise<void> {
    logger.warn(`[Player: ${player.guildId}] Player destroyed. Reason: ${reason || 'Unknown'}`)

    const channel = bot.channels.cache.get(player.textChannelId!)

    // Delete queue empty message if exists
    const queueEmptyMessageId = player.get<string | null>('queueEmptyMessageId')
    if (queueEmptyMessageId) {
      const channel = bot.channels.cache.get(player.textChannelId!)
      if (channel?.isTextBased()) {
        const msg = await (channel as TextChannel).messages
          .fetch(queueEmptyMessageId)
          .catch(() => null)
        if (msg) await safeDeleteMessageNow(msg)
      }
      player.set('queueEmptyMessageId', null)
    }

    // Attempt to cleanup lyrics manager messages
    const mgr = LyricsManager.for(player, bot)
    await mgr.cleanup()

    await safeSendMessageWithContainer(
      channel,
      `${EMOJI.ANIMATED_CAT_BYE} ${getBotName(bot)} đã rời đi.`,
      TIME.SHORT
    )
  }
}

export default new PlayerDestroyEvent()
