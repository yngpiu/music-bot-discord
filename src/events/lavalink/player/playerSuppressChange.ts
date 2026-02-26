import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

class PlayerSuppressChangeEvent extends LavalinkEvent {
  name = 'playerSuppressChange'

  async execute(bot: BotClient, player: Player, suppress: boolean) {
  logger.info(`[Player: ${player.guildId}] Suppress change: ${suppress}`)
  if (suppress) {
    player.set('paused_of_servermute', true) // Reusing the same flag since the effect is identical (can't speak)
    if (!player.paused) await player.pause()
  } else {
    if (player.get('paused_of_servermute')) {
      if (player.paused) await player.resume()
      player.set('paused_of_servermute', false)
    }
  }

  if (player.get('ignore_voice_state')) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const message = suppress
    ? `${EMOJI.ANIMATED_CAT_CRYING} **${bot.user?.displayName || 'tớ'}** đã bị đuổi khỏi sân khấu, không thể tiếp tục phát nhạc.`
    : `${EMOJI.ANIMATED_CAT_LOVE_YOU} **${bot.user?.displayName || 'tớ'}** đã được bế lên sân khấu để phát nhạc.`

  const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })

    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Error sending suppress change notification:`, e)
      return null
    })
}
}

export default new PlayerSuppressChangeEvent()
