import { EmbedBuilder, TextChannel } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

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
    if (!channelId || !messageId) return

    const channel = bot.channels.cache.get(channelId)
    if (channel?.isTextBased()) {
      let msg = (channel as TextChannel).messages.cache.get(messageId)
      if (!msg) {
        msg = await (channel as TextChannel).messages.fetch(messageId).catch(() => undefined)
      }

      if (msg) {
        const title = track?.info?.title || '🎶 Đang phát'
        const embed = new EmbedBuilder()
          .setColor('#E0245E') // Red color
          .setAuthor({ name: '🎤 Live Lyrics' })
          .setTitle(title)
          .setDescription(
            `_Không tìm thấy lời bài hát có hỗ trợ lyrics động (synced) cho bài hát này._`
          )
          .setFooter({ text: 'Thử dùng lệnh "!lyrics" để lấy lời tĩnh nếu có.' })

        await msg.edit({ content: '', embeds: [embed] }).catch(() => {})
      }
    }
  }
}

export default new LyricsNotFoundEventHandler()
