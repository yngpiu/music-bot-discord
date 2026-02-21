import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

export const name = 'playerUpdate'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const execute = async (bot: BotClient, player: Player) => {
  // Triggered frequently when the player updates its state.
  // Useful to sync player data if maintaining an external cache.
}
