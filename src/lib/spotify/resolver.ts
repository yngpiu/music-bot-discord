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

  logger.info(
    `[Spotify:Resolver] Emitting custom parse routine for '${type}' query. (URL: ${query})`
  )

  try {
    // ── Single track ──────────────────────────────────────────────────────────
    if (type === 'track') {
      logger.debug(`[Spotify:Resolver] Instructing Spotify Client to fetch track segment...`)
      const spotifyTrack = await fetchTrack(extractTrackId(query))
      logger.info(
        `[Spotify:Resolver] Intercepted Track: "${spotifyTrack.name}" from ${spotifyTrack.artists.map((a) => a.name).join(', ')}. Passing to Lavalink Build Manager (ISRC: ${spotifyTrack.isrc ?? 'Missing'})`
      )
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
    logger.debug(
      `[Spotify:Resolver] Instructing Spotify Client to fetch bulk structure (${type})...`
    )
    const data =
      type === 'album'
        ? await fetchAlbum(extractAlbumId(query))
        : await fetchPlaylist(extractPlaylistId(query))

    logger.info(
      `[Spotify:Resolver] Intercepted bulk items: ${type.toUpperCase()} "${data.name}" containing ${data.tracks.total} valid tracks. Resolving batch...`
    )

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
