import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player) => {
  logger.info(`[Player: ${player.guildId}] Đã khởi tạo player cho server`)
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
    logger.warn(`[Player: ${player.guildId}] Lỗi bật SponsorBlock:`, e)
  }
}
