import { ContainerBuilder } from 'discord.js'
import { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'
import { formatTrack, lines } from '~/utils/stringUtil.js'

export default async (
  bot: BotClient,
  player: Player,
  track: Track | UnresolvedTrack | null,
  payload: TrackExceptionEvent
) => {
  logger.error(
    `[Lavalink:Player] ${player.guildId} :: ERROR: Encountered a fatal exception while playing track. Details: ${JSON.stringify(payload)}`
  )

  if (!track || !player.textChannelId) return

  const channel = bot.channels.cache.get(player.textChannelId)

  if (!channel?.isTextBased() || !('send' in channel)) return

  const trackDisplay = formatTrack({
    title: track.info.title,
    trackLink: track.info.uri,
    author: track.info.author
  })

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      lines(
        `${EMOJI.ANIMATED_CAT_CRYING} ${trackDisplay} đã gặp sự cố, **${bot.user?.displayName || 'tớ'}** sẽ **bỏ qua** bài hát này.`
      )
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2']
    })
    .catch((e) => {
      logger.error(e)
      return null
    })
}
