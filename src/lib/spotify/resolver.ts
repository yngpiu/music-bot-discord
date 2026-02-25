import type { Player } from 'lavalink-client'
import type { UnresolvedSearchResult } from 'lavalink-client'

import { logger } from '~/utils/logger.js'

import {
  detectSpotifyType,
  extractAlbumId,
  extractPlaylistId,
  extractTrackId,
  fetchAlbum,
  fetchPlaylist,
  fetchTrack
} from './client.js'

// ─── Resolver ─────────────────────────────────────────────────────────────────

export async function spotifySearch(
  player: Player,
  query: string,
  requestUser: unknown
): Promise<UnresolvedSearchResult> {
  const type = detectSpotifyType(query)

  if (!type) {
    return {
      loadType: 'error',
      exception: {
        message: `Cannot detect Spotify type from: "${query}"`,
        cause: 'Unknown Spotify URL',
        causeStackTrace: '',
        severity: 'COMMON'
      },
      pluginInfo: {},
      playlist: null,
      tracks: []
    }
  }

  try {
    // ── Single track ──────────────────────────────────────────────────────────
    if (type === 'track') {
      const spotifyTrack = await fetchTrack(extractTrackId(query))
      const spotifyUrl = `https://open.spotify.com/track/${spotifyTrack.id}`
      const unresolvedTrack = player.LavalinkManager.utils.buildUnresolvedTrack(
        {
          title: spotifyTrack.name,
          author: spotifyTrack.artists.map((a) => a.name).join(', '),
          uri: spotifyUrl,
          artworkUrl: spotifyTrack.album.images[0]?.url ?? null,
          identifier: spotifyTrack.id,
          duration: spotifyTrack.duration_ms,
          isrc: spotifyTrack.isrc ?? null
        },
        requestUser
      )

      return {
        loadType: 'track',
        exception: null,
        pluginInfo: {},
        playlist: null,
        tracks: [unresolvedTrack]
      }
    }

    // ── Album or Playlist ─────────────────────────────────────────────────────
    const data =
      type === 'album'
        ? await fetchAlbum(extractAlbumId(query))
        : await fetchPlaylist(extractPlaylistId(query))

    const tracks = data.tracks.items.map((spotifyTrack) => {
      const spotifyUrl = `https://open.spotify.com/track/${spotifyTrack.id}`
      const track = player.LavalinkManager.utils.buildUnresolvedTrack(
        {
          title: spotifyTrack.name,
          author: spotifyTrack.artists.map((a) => a.name).join(', '),
          uri: spotifyUrl,
          artworkUrl: spotifyTrack.album.images[0]?.url ?? null,
          identifier: spotifyTrack.id,
          duration: spotifyTrack.duration_ms,
          isrc: spotifyTrack.isrc ?? null
        },
        requestUser
      )
      return track
    })

    return {
      loadType: 'playlist',
      exception: null,
      pluginInfo: {},
      playlist: {
        name: data.name,
        title: data.name,
        uri: query,
        thumbnail: data.images[0]?.url,
        selectedTrack: null,
        duration: data.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0)
      },
      tracks
    }
  } catch (err) {
    logger.error(`[Spotify] Lỗi giải mã link: ${query}`, err)
    return {
      loadType: 'error',
      exception: {
        message: err instanceof Error ? err.message : 'Unknown Spotify error',
        cause: 'SpotifyResolver',
        causeStackTrace: '',
        severity: 'COMMON'
      },
      pluginInfo: {},
      playlist: null,
      tracks: []
    }
  }
}

export function isSpotifyQuery(query: string): boolean {
  return query.includes('spotify.com') || query.startsWith('spotify:')
}
