import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, voiceChannelId: string) => {
  logger.warn(`[Player: ${player.guildId}] Bị ngắt kết nối khỏi kênh thoại ${voiceChannelId}`)
  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      `${EMOJI.ANIMATED_CAT_CRYING} **${bot.user?.displayName || 'tớ'}** đã bị ngắt kết nối.`
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })
     
    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Lỗi gửi thông báo disconnect:`, e)
      return null
    })
}
