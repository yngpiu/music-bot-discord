import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, delayMs: number) => {
  logger.info(
    `[Player: ${player.guildId}] Danh sách phát trống, tính giờ chờ rời kênh (${delayMs}ms)`
  )

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  player.set('queueEmptyMessageId', null)

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(`
      ${EMOJI.ANIMATED_CAT_CRYING} Hết nhạc rồi, **${bot.user?.displayName || 'tớ'}** sẽ rời đi trong <t:${Math.round((Date.now() + delayMs) / 1000)}:R> nếu không thấy yêu cầu nào.
    `)
  )

  try {
    const msg = await channel.send({
      components: [container],
      flags: ['IsComponentsV2']
    })
    player.set('queueEmptyMessageId', msg.id)
  } catch (e) {
    logger.warn(`[Player: ${player.guildId}] Lỗi gửi thông báo chờ rời kênh:`, e)
  }
}
