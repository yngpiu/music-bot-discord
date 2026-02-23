import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player) => {
  const owner = player.get<string | null>('owner')
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Player instance created for the guild. Owner: ${owner || 'None'}.`
  )

  player.set('ignore_voice_state', true)
  setTimeout(() => {
    // only ignore for the first 3 seconds after joining/creation
    if (player) player.set('ignore_voice_state', false)
  }, 3000)

  // Enable SponsorBlock for skipping annoying segments
  try {
    await player.setSponsorBlock(['sponsor', 'selfpromo', 'interaction'])
  } catch {
    logger.warn(`[Lavalink:Player] ${player.guildId} :: Failed to set SponsorBlock segments.`)
  }
}
