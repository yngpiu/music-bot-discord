/**
 * @file playerVoiceJoin.ts
 * @description Event handler for when a user joins the bot's voice channel.
 */
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

/**
 * Event handler for the 'playerVoiceJoin' event.
 */
class PlayerVoiceJoinEvent extends LavalinkEvent {
  name = 'playerVoiceJoin'

  /**
   * Placeholder for logic to execute when a user joins the bot's voice channel.
   * @param {BotClient} _bot - The Discord client instance.
   * @param {Player} _player - The Lavalink player instance.
   * @param {string} _userId - The ID of the joining user.
   */
  async execute(): Promise<void> {}
}

export default new PlayerVoiceJoinEvent()
