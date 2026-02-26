/**
 * @file playerVoiceLeave.ts
 * @description Event handler for when a user leaves the bot's voice channel.
 */
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

/**
 * Event handler for the 'playerVoiceLeave' event.
 */
class PlayerVoiceLeaveEvent extends LavalinkEvent {
  name = 'playerVoiceLeave'

  /**
   * Placeholder for logic to execute when a user leaves the bot's voice channel.
   * @param {BotClient} _bot - The Discord client instance.
   * @param {Player} _player - The Lavalink player instance.
   * @param {string} _userId - The ID of the leaving user.
   */
  async execute(_bot: BotClient, _player: Player, _userId: string) {}
}

export default new PlayerVoiceLeaveEvent()
