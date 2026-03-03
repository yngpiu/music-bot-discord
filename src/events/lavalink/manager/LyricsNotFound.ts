import type { Player, Track, UnresolvedTrack } from 'lavalink-client'

import type { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'
import { LyricsManager } from '~/core/LyricsManager.js'

class LyricsNotFoundEventHandler extends LavalinkEvent {
  name = 'LyricsNotFound'

  async execute(
    bot: BotClient,
    player: Player,
    track: Track | UnresolvedTrack | null
  ): Promise<void> {
    const mgr = LyricsManager.for(player, bot)
    if (!mgr.isEnabled) return

    const title = track?.info?.title || 'hiện đang phát'
    mgr.notifyNotFound(title)
  }
}

export default new LyricsNotFoundEventHandler()
