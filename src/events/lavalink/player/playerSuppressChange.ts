import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, suppress: boolean) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: Suppress status changed.`, { suppress })

  if (player.get('ignore_voice_state')) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const message = suppress
    ? `${EMOJI.ANIMATED_CAT_CRYING} Huhu...tớ bị đuổi khỏi sân khấu mất rồi.`
    : `${EMOJI.ANIMATED_CAT_LOVE_YOU} Hehe...tớ được lên sân khấu làm MC rồi nha.`

  const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })
    .catch(() => null)
}
