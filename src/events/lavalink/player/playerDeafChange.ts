import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, selfDeaf: boolean, serverDeaf: boolean) => {
  if (player.get('ignore_voice_state')) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const message = serverDeaf
    ? `${EMOJI.ANIMATED_CAT_CRYING} **${bot.user?.displayName || 'tớ'}** đã bị ai đó bịt tai lại.`
    : `${EMOJI.ANIMATED_CAT_LOVE_YOU} **${bot.user?.displayName || 'tớ'}** đã có thể nghe được trở lại.`

  const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })

    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Error sending server deaf change notification:`, e)
      return null
    })
}
