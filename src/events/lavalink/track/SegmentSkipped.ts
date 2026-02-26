/**
 * @file SegmentSkipped.ts
 * @description Event handler for when a SponsorBlock segment is automatically skipped during playback.
 */
import { ContainerBuilder } from 'discord.js'
import { Player, SponsorBlockSegmentSkipped, Track } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'SegmentSkipped' event.
 */
class SegmentSkippedEvent extends LavalinkEvent {
  name = 'SegmentSkipped'

  /**
   * Logs the skip and notifies the text channel about the category of the skipped segment.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {Track} track - The track where the segment was skipped.
   * @param {SponsorBlockSegmentSkipped} payload - Details about the skipped segment.
   */
  async execute(bot: BotClient, player: Player, track: Track, payload: SponsorBlockSegmentSkipped) {
    logger.info(
      `[Player: ${player.guildId}] Automatically skipped ${payload.segment.category} segment in the track`
    )
    const channel = bot.channels.cache.get(player.textChannelId!)
    if (!channel?.isTextBased() || !('send' in channel)) return

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

    const message = `${EMOJI.ANIMATED_CAT_DANCE} **${bot.user?.displayName || 'tớ'}** vừa tự động bỏ qua **đoạn ${category}**.`

    const container = new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(message))

    await channel
      .send({
        components: [container],
        flags: ['IsComponentsV2', 'SuppressNotifications']
      })

      .catch((e) => {
        logger.warn(`[Player: ${player.guildId}] Error sending segment skipped notification:`, e)
        return null
      })
  }
}

export default new SegmentSkippedEvent()
