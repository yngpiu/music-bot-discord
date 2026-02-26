/**
 * @file trackEnd.ts
 * @description Event handler for when a track finishes playing.
 */
import { Player, Track, TrackEndEvent } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'
import { recordTrackPlay } from '~/lib/trackService.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'trackEnd' event.
 */
class TrackEndHandler extends LavalinkEvent {
  name = 'trackEnd'

  /**
   * Logs the event and records the track play in the database.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {Track | null} track - The track that ended.
   * @param {TrackEndEvent} payload - The track end event data.
   */
  async execute(bot: BotClient, player: Player, track: Track | null, payload: TrackEndEvent): Promise<void> {
    logger.debug(
      `[Player: ${player.guildId}] Track ended: ${track?.info?.title || 'Unknown'} (Reason: ${payload.reason})`
    )

    if (payload.reason !== 'finished' || !track) return

    const listenerIds: string[] = []
    try {
      const guild = bot.guilds.cache.get(player.guildId)
      const voiceChannel = guild?.channels.cache.get(player.voiceChannelId!)
      if (voiceChannel?.isVoiceBased()) {
        voiceChannel.members.forEach((member) => {
          if (!member.user.bot) {
            listenerIds.push(member.id)
          }
        })
      }
    } catch (e) {
      logger.warn(`[Player: ${player.guildId}] Could not get VC member list:`, e)
    }

    // Capture play statistics for the track.
    recordTrackPlay(
      {
        sourceName: track.info.sourceName,
        identifier: track.info.identifier,
        isrc: track.info.isrc,
        title: track.info.title,
        author: track.info.author,
        artworkUrl: track.info.artworkUrl,
        uri: track.info.uri
      },
      player.guildId,
      listenerIds,
      bot.user!.id
    )
  }
}

export default new TrackEndHandler()
