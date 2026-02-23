import { EmbedBuilder } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'

import { formatDuration } from '~/utils/stringUtil'

function getTrackInfo(track: Track | UnresolvedTrack) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return 'info' in track ? track.info : (track as any).info
}

// ─── Embeds ───────────────────────────────────────────────────────────────────

/**
 * "Started playing X by Y" — shown on trackStart event
 */

/**
 * "Added Track" embed — shown when a single track is queued
 */
export type AddedItemType = 'track' | 'playlist'

export function buildAddedItemEmbed(
  type: AddedItemType,
  item: {
    title: string
    tracks: (Track | UnresolvedTrack)[]
    thumbnailUrl?: string | null
    author?: string | null
    trackLink?: string
    playlistLink?: string
    authorLink?: string | null
  },
  player: Player,
  requester?: { displayName?: string; username?: string; displayAvatarURL?: () => string } | null,
  botAvatarUrl?: string,
  positionOverride?: number,
  estimatedMsOverride?: number
) {
  const isPlaylist = type === 'playlist'
  const totalDurationMs = item.tracks.reduce((sum, t) => sum + (getTrackInfo(t).duration ?? 0), 0)

  // Calculate estimated time and queue position
  // player.queue.tracks -> is the future list, it doesn't include the upcoming track if we just enqueued it unless it's the very first play
  const incomingLength = isPlaylist ? item.tracks.length : 1
  let queueLength = positionOverride ?? 0
  if (!positionOverride && player.playing) {
    queueLength = player.queue.tracks.length - incomingLength + 1
  }

  const estimatedMs =
    estimatedMsOverride ??
    Math.max(0, player.queue.utils.totalDuration() - totalDurationMs - (player.position ?? 0))

  const embed = new EmbedBuilder()
    .setColor(0x00c2e6)
    .setAuthor({
      name: isPlaylist ? 'Thêm danh sách phát' : 'Thêm bài hát',
      iconURL: botAvatarUrl
    })
    .setThumbnail(item.thumbnailUrl ?? null)

  if (isPlaylist) {
    embed.addFields({
      name: 'Danh sách phát',
      value: item.playlistLink ? `**[${item.title}](${item.playlistLink})**` : `**${item.title}**`,
      inline: false
    })
  } else {
    embed.addFields({
      name: 'Bài hát',
      value: `**[${item.title}](${item.trackLink})**${item.authorLink ? ` bởi **[${item.author}](${item.authorLink})**` : ''}`,
      inline: false
    })
  }

  // Common fields
  embed.addFields(
    {
      name: 'Thời lượng',
      value: `${formatDuration(totalDurationMs)} ${isPlaylist ? `• ${item.tracks.length} bài` : ''}`,
      inline: false
    },
    { name: 'Vị trí', value: `${Math.max(0, queueLength)}`, inline: true },
    { name: 'Thời gian chờ', value: formatDuration(estimatedMs), inline: true }
  )

  if (requester) {
    const requesterName = requester.displayName ?? requester.username ?? null
    const avatar = requester.displayAvatarURL?.() ?? undefined
    if (requesterName)
      embed.setFooter({ text: `Được yêu cầu bởi ${requesterName}`, iconURL: avatar })
  }

  return { embeds: [embed], files: [] }
}
