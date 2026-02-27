// Event handler for when a SponsorBlock segment is automatically skipped during playback.
import { Player, SponsorBlockSegmentSkipped, Track } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { sendContainerMessage } from '~/utils/messageUtil'
import { getBotName } from '~/utils/stringUtil.js'

// Event handler for the 'SegmentSkipped' event.
class SegmentSkippedEvent extends LavalinkEvent {
  name = 'SegmentSkipped'

  // Logs the skip and notifies the text channel about the category of the skipped segment.
  async execute(
    bot: BotClient,
    player: Player,
    track: Track,
    payload: SponsorBlockSegmentSkipped
  ): Promise<void> {
    logger.info(
      `[Player: ${player.guildId}] Automatically skipped ${payload.segment.category} segment in the track`
    )
    if (!player.textChannelId) return
    const channel = bot.channels.cache.get(player.textChannelId)

    // Map English categories to Vietnamese for user-facing messages.
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

    const message = `${EMOJI.ANIMATED_CAT_BLINK} **${getBotName(bot)}** vừa tự động bỏ qua **đoạn ${category}**.`

    await sendContainerMessage(channel, message)
  }
}

export default new SegmentSkippedEvent()
