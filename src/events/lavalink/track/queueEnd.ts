/**
 * @file queueEnd.ts
 * @description Event handler for when the queue has completely finished playing (last track ended).
 */
import { Player, Track, TrackEndEvent } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'
import { recordTrackPlay } from '~/lib/trackService.js'

import { logger } from '~/utils/logger.js'

/**
 * Event handler for the 'queueEnd' event.
 */
class QueueEndEvent extends LavalinkEvent {
  name = 'queueEnd'

  /**
   * Records the final track play and performs cleanup when the queue ends.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Player} player - The Lavalink player instance.
   * @param {Track | null} track - The last track that played.
   * @param {TrackEndEvent} payload - The track end event data.
   */
  async execute(bot: BotClient, player: Player, track: Track | null, payload: TrackEndEvent) {
    logger.debug(
      `[Player: ${player.guildId}] queueEnd event triggered because the last track finished`
    )

    if (payload?.reason !== 'finished' || !track) return

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

    // Record the play count for the final track.
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

export default new QueueEndEvent()
