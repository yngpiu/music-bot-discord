import { type TextChannel } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { safeSendMessageWithContainer } from '~/utils/messageUtil'

class LyricsNotFoundEventHandler extends LavalinkEvent {
  name = 'LyricsNotFound'

  async execute(
    bot: BotClient,
    player: Player,
    track: Track | UnresolvedTrack | null
  ): Promise<void> {
    const isLive = player.get<boolean>('liveLyrics')
    if (!isLive) return

    logger.warn(
      `[Player: ${player.guildId}] Live Lyrics NOT found for track: ${track?.info?.title}`
    )

    const channelId = player.get<string | null>('lyricsChannelId')
    const messageId = player.get<string | null>('lyricsMessageId')
    if (!channelId) return

    const channel = bot.channels.cache.get(channelId)
    if (channel?.isTextBased()) {
      if (messageId) {
        const msg = (channel as TextChannel).messages.cache.get(messageId)
        if (!msg) {
          await (channel as TextChannel).messages.fetch(messageId).catch(() => undefined)
        }
      }
      const title = track?.info?.title || 'hiện đang phát'

      await safeSendMessageWithContainer(
        channel,
        `${EMOJI.ERROR} Không tìm thấy lời bài hát **${title}**.`
      )
    }
  }
}

export default new LyricsNotFoundEventHandler()
