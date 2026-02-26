import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class PlayerCreateEvent extends LavalinkEvent {
  name = 'playerCreate'

  async execute(bot: BotClient, player: Player) {
  logger.info(`[Player: ${player.guildId}] Initialized player for server`)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const owner = player.get<string | null>('owner')

  player.set('ignore_voice_state', true)
  setTimeout(() => {
    // only ignore for the first 3 seconds after joining/creation
    if (player) player.set('ignore_voice_state', false)
  }, 3000)

  // Enable SponsorBlock for skipping annoying segments
  try {
    await player.setSponsorBlock([
      'sponsor',
      'selfpromo',
      'interaction',
      'intro',
      'outro',
      'preview',
      'music_offtopic',
      'filler'
    ])
  } catch (e) {
    logger.warn(`[Player: ${player.guildId}] Error enabling SponsorBlock:`, e)
  }
}
}

export default new PlayerCreateEvent()
