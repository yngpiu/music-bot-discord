/**
 * @file embeds.ts
 * @description Utilities for building complex Discord embeds for music-related feedback.
 */
import { EmbedBuilder } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'

import { formatDuration, formatTrack } from '~/utils/stringUtil'

/**
 * Extracts the info property from either a Track or UnresolvedTrack.
 * @param {Track | UnresolvedTrack} track - The track object.
 * @returns {object} - The track's info.
 */
function getTrackInfo(track: Track | UnresolvedTrack) {
  return 'info' in track ? track.info : (track as any).info
}

export type AddedItemType = 'track' | 'playlist'

/**
 * Builds a standardized embed notifying that a track or playlist has been added to the queue.
 * @param {AddedItemType} type - Whether a single track or a playlist was added.
 * @param {object} item - Metadata about the added item.
 * @param {Player} player - The current Lavalink player.
 * @param {object} [requester] - The user who requested the item.
 * @param {string} [botAvatarUrl] - The bot's avatar URL.
 * @param {number} [positionOverride] - Manual queue position override.
 * @param {number} [estimatedMsOverride] - Manual wait time override.
 * @returns {object} - An object containing the embed and any files (for use in channel.send).
 */
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
    const content = formatTrack({
      title: item.title,
      trackLink: item.trackLink,
      author: item.author
    })
    embed.addFields({
      name: 'Bài hát',
      value: content,
      inline: false
    })
  }

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
