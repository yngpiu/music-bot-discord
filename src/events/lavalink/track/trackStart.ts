// Event handler for when a track starts playing.
import { Player, Track } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { TIME } from '~/constants/time'
import { BotClient } from '~/core/BotClient.js'
import { LavalinkEvent } from '~/core/LavalinkEvent.js'

import { logger } from '~/utils/logger.js'
import { safeSendMessageWithContainer } from '~/utils/messageUtil'
import { formatDuration, formatTrack } from '~/utils/stringUtil'

// Event handler for the 'trackStart' event.
class TrackStartEvent extends LavalinkEvent {
  name = 'trackStart'

  // Logs the start of playback and sends a "Now Playing" notification to the text channel.
  async execute(bot: BotClient, player: Player, track: Track): Promise<void> {
    logger.info(`[Player: ${player.guildId}] Started playing track: ${track?.info?.title}`)

    if (!track || !player.textChannelId) return
    const channel = bot.channels.cache.get(player.textChannelId)

    let stringDuration = ''
    if (track.info.duration) {
      stringDuration = formatDuration(track.info.duration)
    }

    const trackDisplay = formatTrack({
      title: track.info.title,
      trackLink: track.info.uri,
      author: track.info.author
    })

    await safeSendMessageWithContainer(
      channel,
      `${EMOJI.ANIMATED_CAT_DANCE} Bắt đầu phát **\\[${stringDuration}\\]** ${trackDisplay}`,
      TIME.MEDIUM
    )

    // Handle Live Lyrics re-subscribe
    const isLive = player.get<boolean>('liveLyrics')
    if (isLive) {
      if (channel?.isTextBased()) {
        const msg = await (channel as import('discord.js').TextChannel).send({
          content: '🎤 Đang tìm lời bài hát (Live)...'
        })
        player.set('lyricsMessageId', msg.id)
        player.set('lyricsChannelId', channel.id)
      }
      player.subscribeLyrics().catch(() => {})
    }
  }
}

export default new TrackStartEvent()
