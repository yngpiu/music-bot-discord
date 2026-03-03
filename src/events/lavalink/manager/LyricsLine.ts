import { EmbedBuilder, type Message, type TextChannel } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import type { LyricsLine, LyricsLineEvent } from 'lavalink-client/dist/index.js'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { getBotAvatar } from '~/utils/stringUtil'

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
    let messageId = player.get<string | null>('lyricsMessageId')
    if (!channelId) return

    let retries = 0
    while (messageId === 'pending' && retries < 15) {
      await new Promise((r) => setTimeout(r, 200))
      messageId = player.get<string | null>('lyricsMessageId')
      retries++
    }

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
      // Skip empty or purely whitespace lines if preferred, but lyrics normally has actual line text
      const line = payload.line?.line?.trim() || '...'
      const syncedLyrics = player.get<LyricsLine[]>('syncedLyrics')
      let lyricsDisplay = `**${line}**`

      if (syncedLyrics && payload.lineIndex !== undefined) {
        const index = payload.lineIndex
        const prev2 = syncedLyrics[index - 2]?.line?.trim()
        const prev1 = syncedLyrics[index - 1]?.line?.trim()
        const next1 = syncedLyrics[index + 1]?.line?.trim()
        const next2 = syncedLyrics[index + 2]?.line?.trim()

        const linesToShow = []
        if (prev2) linesToShow.push(`-# ${prev2}`)
        if (prev1) linesToShow.push(`-# ${prev1}`)
        linesToShow.push(`**${line}**`)
        if (next1) linesToShow.push(`-# ${next1}`)
        if (next2) linesToShow.push(`-# ${next2}`)

        lyricsDisplay = linesToShow.join('\n')
      }

      const embed = new EmbedBuilder().setAuthor({
        name: `Đang phát ${title}...`,
        iconURL: getBotAvatar(bot)
      })

      if (track?.info?.artworkUrl) {
        embed.setThumbnail(track.info.artworkUrl)
      }

      embed.setDescription(lyricsDisplay)

      if (msg) {
        await msg.edit({ content: '', embeds: [embed] }).catch(() => {})
      } else {
        player.set('lyricsMessageId', 'pending')
        msg = await (channel as TextChannel)
          .send({ content: '', embeds: [embed] })
          .catch(() => undefined)
        if (msg) {
          player.set('lyricsMessageId', msg.id)
        } else {
          player.set('lyricsMessageId', null)
        }
      }
    }
  }
}

export default new LyricsLineEventHandler()
