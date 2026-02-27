// Event handler for when the queue-empty leave timer is cancelled due to new tracks being added.
import { TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

// Event handler for the 'playerQueueEmptyCancel' event.
class PlayerQueueEmptyCancelEvent extends LavalinkEvent {
  name = 'playerQueueEmptyCancel'

  // Logs a message indicating that the leave timer has been cancelled.
  async execute(bot: BotClient, player: Player): Promise<void> {
    logger.info(
      `[Player: ${player.guildId}] Cancelled leave channel schedule because a new track was added`
    )

    const msgId = player.get('queueEmptyMessageId')
    if (msgId) {
      const channel = bot.channels.cache.get(player.textChannelId!)
      if (channel?.isTextBased()) {
        try {
          const msg = await (channel as TextChannel).messages.fetch(msgId as string)
          if (msg?.deletable) {
            await msg.delete().catch((e: Error) => {
              logger.warn(
                `[Player: ${player.guildId}] Error deleting queueEmptyMessageId message:`,
                e.message
              )
            })
          }
        } catch (e: unknown) {
          logger.warn(
            `[Player: ${player.guildId}] Error fetching queueEmptyMessageId message:`,
            e.message
          )
        }
      }
      player.set('queueEmptyMessageId', null)
    }
  }
}

export default new PlayerQueueEmptyCancelEvent()
