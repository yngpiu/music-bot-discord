import { AttachmentBuilder, ContainerBuilder, EmbedBuilder, MessageFlags } from 'discord.js'
import type { Player, Track, UnresolvedTrack } from 'lavalink-client'
import path from 'path'
import { fileURLToPath } from 'url'

import { EMOJI } from '~/constants/emoji'

import { formatDuration, lines } from '~/utils/stringUtil'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const assetsDir = path.join(__dirname, '../../assets')

// ─── Source icon helpers ───────────────────────────────────────────────────────

type SourceName =
  | 'spotify'
  | 'deezer'
  | 'youtube'
  | 'youtubemusic'
  | 'soundcloud'
  | 'applemusic'
  | string

function getSourceIcon(
  sourceName: SourceName
): { attachment: AttachmentBuilder; filename: string } | null {
  const map: Record<string, string> = {
    spotify: 'spotify.png',
    deezer: 'deezer.png',
    youtube: 'youtube.png',
    youtubemusic: 'youtube_music.png',
    soundcloud: 'soundcloud.png',
    applemusic: 'apple_music.png'
  }
  const file = map[sourceName?.toLowerCase()]
  if (!file) return null
  const filename = file
  const attachment = new AttachmentBuilder(path.join(assetsDir, file), { name: filename })
  return { attachment, filename }
}

function getTrackInfo(track: Track | UnresolvedTrack) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return 'info' in track ? track.info : (track as any).info
}

// ─── Embeds ───────────────────────────────────────────────────────────────────

/**
 * "Started playing X by Y" — shown on trackStart event
 */
export function buildNowPlayingEmbed(track: Track) {
  const trackLink = track?.info?.uri || 'https://github.com/yngpiu'
  const authorLink = track?.pluginInfo?.artistUrl || null
  let stringDuration = ''
  if (track.info.duration) {
    stringDuration = formatDuration(track.info.duration)
  }
  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      lines(
        `${EMOJI.ANIMATED_CD_SPINNING} Bắt đầu phát **[[${stringDuration}] ${track.info.title}](${trackLink})**${authorLink ? ` bởi **[${track.info.author}](${authorLink})**` : ''}`
      )
    )
  )

  return {
    components: [container],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    flags: MessageFlags.IsComponentsV2 as any
  }
}

/**
 * "Added Track" embed — shown when a single track is queued
 */
export function buildAddedTrackEmbed(
  track: Track | UnresolvedTrack,
  player: Player,
  requester: { displayName?: string; username?: string; displayAvatarURL?: () => string } | null
) {
  const info = getTrackInfo(track)
  const queueLength = player.queue.tracks.length
  const positionInQueue = queueLength // just added, so it's at the end
  const estimatedMs = Math.max(
    0,
    player.queue.utils.totalDuration() -
      (getTrackInfo(track).duration ?? 0) -
      (player.position ?? 0)
  )

  const source = getSourceIcon(info.sourceName)

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setAuthor({
      name: 'Added Track',
      iconURL: source ? `attachment://${source.filename}` : undefined
    })
    .setThumbnail(info.artworkUrl ?? null)
    .addFields(
      {
        name: 'Track',
        value: `**[${info.title}](${info.uri ?? ''}) by ${info.author}**`,
        inline: false
      },
      { name: 'Estimated time until played', value: formatDuration(estimatedMs), inline: true },
      { name: 'Track Length', value: formatDuration(info.duration ?? 0), inline: true },
      { name: 'Position in upcoming', value: `${Math.max(1, queueLength - 1)}`, inline: true },
      { name: 'Position in queue', value: `${positionInQueue}`, inline: true }
    )

  if (requester) {
    const name = requester.displayName ?? requester.username ?? 'Unknown'
    const avatar = requester.displayAvatarURL?.() ?? undefined
    embed.setFooter({ text: `Requested by ${name}`, iconURL: avatar })
  }

  return {
    embeds: [embed],
    files: source ? [source.attachment] : []
  }
}

/**
 * "Added Playlist" embed — shown when a playlist/album is queued
 */
export function buildAddedPlaylistEmbed(
  name: string,
  tracks: (Track | UnresolvedTrack)[],
  thumbnailUrl?: string | null
) {
  const totalDurationMs = tracks.reduce((sum, t) => sum + (getTrackInfo(t).duration ?? 0), 0)

  const embed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setAuthor({ name: 'Added Playlist' })
    .setThumbnail(thumbnailUrl ?? null)
    .addFields(
      { name: 'Playlist', value: `**${name}**`, inline: false },
      { name: 'Playlist Length', value: formatDuration(totalDurationMs), inline: true },
      { name: 'Tracks', value: `${tracks.length}`, inline: true }
    )

  return { embeds: [embed], files: [] }
}
