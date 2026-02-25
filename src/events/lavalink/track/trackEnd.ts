import { Player, Track, TrackEndEvent } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'
import { recordTrackPlay } from '~/lib/trackService.js'

import { logger } from '~/utils/logger.js'

export default async (
  bot: BotClient,
  player: Player,
  track: Track | null,
  payload: TrackEndEvent
) => {
  logger.debug(
    `[Player: ${player.guildId}] Bài hát kết thúc: ${track?.info?.title || 'Không rõ'} (Lý do: ${payload.reason})`
  )
  // Chỉ ghi nhận khi bài hát phát xong hoàn toàn
  if (payload.reason !== 'finished' || !track) return

  // Snapshot tất cả members trong voice channel lúc bài kết thúc (loại bỏ bots)
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
    logger.warn(`[Player: ${player.guildId}] Không lấy được danh sách thành viên VC:`, e)
  }

  // Fire-and-forget: ghi nhận lượt phát, không block player
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
