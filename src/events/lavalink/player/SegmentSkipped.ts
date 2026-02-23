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
    `[Lavalink:Player] ${player.guildId} :: Skipped SponsorBlock segment: ${payload.segment.category}`
  )

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const segmentMap: Record<string, string> = {
    sponsor: 'đoạn nhà tài trợ',
    selfpromo: 'đoạn quảng cáo bản thân',
    interaction: 'đoạn tương tác (nhắc like/sub)',
    intro: 'đoạn mở đầu',
    outro: 'đoạn kết thúc',
    preview: 'đoạn xem trước',
    music_offtopic: 'đoạn nhạc không liên quan',
    filler: 'đoạn câu giờ'
  }

  const category = segmentMap[payload.segment.category] || payload.segment.category

  const message = `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** vừa tự động bỏ qua **${category}** của video này để bạn nghe nhạc không bị gián đoạn nhé.`

  const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })
    .catch(() => null)
}
