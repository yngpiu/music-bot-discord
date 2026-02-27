// Event handler for when a user leaves the bot's voice channel.
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

// Event handler for the 'playerVoiceLeave' event.
class PlayerVoiceLeaveEvent extends LavalinkEvent {
  name = 'playerVoiceLeave'

  // Placeholder for logic to execute when a user leaves the bot's voice channel.
  async execute(): Promise<void> {}
}

export default new PlayerVoiceLeaveEvent()
