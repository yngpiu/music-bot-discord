import { Events, VoiceState } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'
import { BotEvent } from '~/core/BotEvent.js'
import type { BotManager } from '~/core/BotManager.js'

import { logger } from '~/utils/logger.js'

class VoiceStateUpdateEvent extends BotEvent {
  name = Events.VoiceStateUpdate

  async execute(
    bot: BotClient,
    manager: BotManager,
    _oldState: VoiceState,
    newState: VoiceState
  ): Promise<void> {
    // Only the bot whose voice state is updating should handle its own logic
    if (newState.id !== bot.user?.id) return

    // If the bot just joined or moved to a voice channel
    if (newState.channelId) {
      // Find if there is another bot from our manager in the SAME voice channel
      const otherBotInChannel = manager.bots.find(
        (b) =>
          b.user?.id !== bot.user?.id &&
          b.guilds.cache.get(newState.guild.id)?.members.me?.voice?.channelId === newState.channelId
      )

      if (otherBotInChannel) {
        logger.warn(
          `[VoiceStateUpdate] Detected multiple bots in the same channel in guild ${newState.guild.id}. Disconnecting bot ${bot.user?.id} (${bot.user?.username}).`
        )
        // Another bot is already here. Disconnect this one.
        const player = bot.lavalink.getPlayer(newState.guild.id)
        if (player) {
          // If the player is active, destroy it to disconnect
          await player.destroy()
        } else {
          try {
            await newState.member?.voice.disconnect()
          } catch (e) {
            logger.error('[VoiceStateUpdate] Failed to disconnect bot manually:', e)
          }
        }
      }
    }
  }
}

export default new VoiceStateUpdateEvent()
