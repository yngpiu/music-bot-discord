import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class PlayerUpdateEvent extends LavalinkEvent {
  name = 'playerUpdate'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_bot: BotClient, _player: Player) {
    // Triggered frequently when the player updates its state.
    // Useful to sync player data if maintaining an external cache.
  }
}

export default new PlayerUpdateEvent()
