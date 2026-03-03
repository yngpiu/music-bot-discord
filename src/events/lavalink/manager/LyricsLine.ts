import { EmbedBuilder, TextChannel } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import type { LyricsLineEvent } from 'lavalink-client/dist/index.js'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'

class LyricsLineEventHandler extends LavalinkEvent {
  name = 'LyricsLine'

  async execute(
    bot: BotClient,
    player: Player,
    track: Track | UnresolvedTrack | null,
    payload: LyricsLineEvent
  ): Promise<void> {
    const isLive = player.get<boolean>('liveLyrics')
    if (!isLive) return

    const channelId = player.get<string | null>('lyricsChannelId')
    const messageId = player.get<string | null>('lyricsMessageId')
    if (!channelId || !messageId) return

    const channel = bot.channels.cache.get(channelId)
    if (channel?.isTextBased()) {
      // Fetching the message might be skipped to save requests,
      // but we need it to edit. We use cache first.
      let msg = (channel as TextChannel).messages.cache.get(messageId)
      if (!msg) {
        msg = await (channel as TextChannel).messages.fetch(messageId).catch(() => undefined)
      }

      if (msg) {
        const title = track?.info?.title || '🎶 Đang phát'
        // Skip empty or purely whitespace lines if preferred, but lyrics normally has actual line text
        const line = payload.line?.line?.trim() || '🎵 ...'

        const embed = new EmbedBuilder()
          .setColor('#1DB954')
          .setAuthor({ name: '🎤 Live Lyrics' })
          .setTitle(title)
          .setDescription(`**${line}**`)

        await msg.edit({ content: '', embeds: [embed] }).catch((e) => {
          logger.error(
            `[LyricsLine] Failed to edit lyrics message for guild ${player.guildId}:`,
            e.message
          )
        })
      }
    }
  }
}

export default new LyricsLineEventHandler()
