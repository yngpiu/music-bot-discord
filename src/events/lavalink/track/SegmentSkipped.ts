import { ContainerBuilder } from 'discord.js'
import { Player, SponsorBlockSegmentSkipped, Track } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (
  bot: BotClient,
  player: Player,
  track: Track,
  payload: SponsorBlockSegmentSkipped
) => {
  logger.info(
    `[Player: ${player.guildId}] Đã tự động bỏ qua đoạn ${payload.segment.category} trong bài hát`
  )
  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const segmentMap: Record<string, string> = {
    sponsor: 'quảng cáo nhà tài trợ',
    selfpromo: 'quảng cáo bản thân',
    interaction: 'nhắc tương tác',
    intro: 'mở đầu',
    outro: 'kết thúc',
    preview: 'xem trước',
    music_offtopic: 'nhạc không liên quan',
    filler: 'câu giờ'
  }

  const category = segmentMap[payload.segment.category] || payload.segment.category

  const message = `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** vừa tự động bỏ qua **đoạn ${category}**.`

  const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    })
     
    .catch((e) => {
      logger.warn(`[Player: ${player.guildId}] Lỗi gửi thông báo segment skipped:`, e)
      return null
    })
}
