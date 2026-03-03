import { EmbedBuilder } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import type { LyricsLine, LyricsLineEvent } from 'lavalink-client/dist/index.js'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'
import { LyricsManager } from '~/core/LyricsManager.js'

import { getBotAvatar } from '~/utils/stringUtil'

class LyricsLineEventHandler extends LavalinkEvent {
  name = 'LyricsLine'

  async execute(
    bot: BotClient,
    player: Player,
    track: Track | UnresolvedTrack | null,
    payload: LyricsLineEvent
  ): Promise<void> {
    const mgr = LyricsManager.for(player, bot)
    if (!mgr.isEnabled) return

    const title = track?.info?.title || '🎶 Đang phát'
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

    mgr.sendOrUpdate(embed)
  }
}

export default new LyricsLineEventHandler()
