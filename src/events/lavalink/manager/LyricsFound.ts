import { EmbedBuilder, TextChannel } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import type { LyricsFoundEvent } from 'lavalink-client/dist/index.js'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

class LyricsFoundEventHandler extends LavalinkEvent {
  name = 'LyricsFound'

  async execute(
    bot: BotClient,
    player: Player,
    track: Track | UnresolvedTrack | null,
    payload: LyricsFoundEvent
  ): Promise<void> {
    const isLive = player.get<boolean>('liveLyrics')
    if (!isLive) return

    logger.info(`[Player: ${player.guildId}] Live Lyrics found for track: ${track?.info?.title}`)

    // optionally, we can let user know we found lyrics
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
          .setColor('#1DB954')
          .setAuthor({ name: '🎤 Live Lyrics' })
          .setTitle(title)
          .setDescription(
            `_Đã tìm thấy lời bài hát từ ${payload.lyrics.provider || payload.lyrics.sourceName}, chuẩn bị phát..._`
          )

        await msg.edit({ content: '', embeds: [embed] }).catch(() => {})
      }
    }
  }
}

export default new LyricsFoundEventHandler()
