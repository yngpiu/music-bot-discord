import { EmbedBuilder, type Message, type TextChannel } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import type { LyricsFoundEvent } from 'lavalink-client/dist/index.js'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { getBotAvatar } from '~/utils/stringUtil'

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

    // Store lines to allow multi-line rendering
    if (payload.lyrics.lines?.length) {
      player.set('syncedLyrics', payload.lyrics.lines)
    }

    const channelId = player.get<string | null>('lyricsChannelId')
    const messageId = player.get<string | null>('lyricsMessageId')
    if (!channelId) return

    const channel = bot.channels.cache.get(channelId)
    if (channel?.isTextBased()) {
      let msg: Message | undefined
      if (messageId) {
        msg = (channel as TextChannel).messages.cache.get(messageId)
        if (!msg) {
          msg = await (channel as TextChannel).messages.fetch(messageId).catch(() => undefined)
        }
      }

      const title = track?.info?.title || '🎶 Đang phát'
      const embed = new EmbedBuilder().setAuthor({
        name: `Đang phát ${title}...`,
        iconURL: getBotAvatar(bot)
      })

      if (track?.info?.artworkUrl) {
        embed.setThumbnail(track.info.artworkUrl)
      }
      embed.setDescription(`Đã tìm thấy lời bài hát, chuẩn bị phát...`)

      if (msg) {
        await msg.edit({ embeds: [embed] }).catch(() => {})
      } else {
        player.set('lyricsMessageId', 'pending')
        msg = await (channel as TextChannel).send({ embeds: [embed] }).catch(() => undefined)
        if (msg) {
          player.set('lyricsMessageId', msg.id)
        } else {
          player.set('lyricsMessageId', null)
        }
      }
    }
  }
}

export default new LyricsFoundEventHandler()
