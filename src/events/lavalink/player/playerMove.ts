import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (
  bot: BotClient,
  player: Player,
  oldVoiceChannelId: string,
  newVoiceChannelId: string
) => {
  logger.info(
    `[Player: ${player.guildId}] Bị di chuyển ra khỏi ${oldVoiceChannelId} sang ${newVoiceChannelId}`
  )
  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      `${EMOJI.ANIMATED_CAT_NO_IDEA} Ai đó đã bê **${bot.user?.displayName || 'tớ'}** sang kênh <#${newVoiceChannelId}>.`
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })
     
    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Lỗi gửi thông báo move:`, e)
      return null
    })
}
