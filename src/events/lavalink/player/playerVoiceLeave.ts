import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

// IGNORE
class PlayerVoiceLeaveEvent extends LavalinkEvent {
  name = 'playerVoiceLeave'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_bot: BotClient, _player: Player, _userId: string) {}
}

export default new PlayerVoiceLeaveEvent()
