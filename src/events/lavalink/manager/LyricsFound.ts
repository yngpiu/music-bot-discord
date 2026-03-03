import { EmbedBuilder } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import type { LyricsFoundEvent } from 'lavalink-client/dist/index.js'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'
import { LyricsManager } from '~/core/LyricsManager.js'

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
    const mgr = LyricsManager.for(player, bot)
    if (!mgr.isEnabled) return

    logger.info(`[Player: ${player.guildId}] Live Lyrics found for track: ${track?.info?.title}`)

    // Store synced lines for multi-line rendering in LyricsLine
    if (payload.lyrics.lines?.length) {
      player.set('syncedLyrics', payload.lyrics.lines)
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

    mgr.sendOrUpdate(embed)
  }
}

export default new LyricsFoundEventHandler()
