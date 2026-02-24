import * as fs from 'fs'
import * as path from 'path'
import { type Browser, type BrowserContext, type Page, type Response, chromium } from 'playwright'

import { logger } from '~/utils/logger.js'

// --- Constants ---

const SPOTIFY_API_BASE = 'https://api-partner.spotify.com/pathfinder/v2/query'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const HASHES = {
  fetchPlaylist: 'bb67e0af06e8d6f52b531f97468ee4acd44cd0f82b988e15c2ea47b1148efc77',
  getAlbum: 'b9bfabef66ed756e5e13f68a942deb60bd4125ec1f1be8cc42769dc0259b4b10',
  getTrack: '612585ae06ba435ad26369870deaae23b5c8800a256cd8a57e08eddc25a37294',
  internalLinkRecommenderTrack: 'c77098ee9d6ee8ad3eb844938722db60570d040b49f41f5ec6e7be9160a7c86b',
  searchTracks: '131fd38c13431be963a851082dca0108a4200998b886e7e9d20a21fc51a36aaf',
  searchPlaylists: 'af1730623dc1248b75a61a18bad1f47f1fc7eff802fb0676683de88815c958d8'
}

// --- Types ---

export interface SpotifyToken {
  accessToken: string
  clientId: string
  accessTokenExpirationTimestampMs: number
  isAnonymous: boolean
  expiresIn?: number
}

export interface SpotifyTrack {
  id: string
  name: string
  artists: { id: string; name: string }[]
  album: {
    id: string
    name: string
    images: { url: string; height?: number; width?: number }[]
  }
  duration_ms: number
  preview_url: string | null
  is_playable?: boolean
  isrc?: string
}

export interface SpotifyPlaylist {
  id: string
  name: string
  description: string
  images: { url: string; height?: number; width?: number }[]
  tracks: {
    items: SpotifyTrack[]
    total: number
  }
}

export interface SpotifyRecommendations {
  seeds: { id: string; type: string; href: null }[]
  tracks: SpotifyTrack[]
}

export type SpotifyType = 'track' | 'album' | 'playlist'

export type SpotifyResult = SpotifyTrack | SpotifyPlaylist

// --- Types: Internal Raw Spotify Data ---

interface RawImage {
  url: string
  width?: number
  height?: number
}

interface RawArtist {
  uri?: string
  id?: string
  profile?: { name: string }
  name?: string
}

interface RawTrack {
  uri?: string
  id?: string
  name?: string
  artists?: { items: RawArtist[] }
  albumOfTrack?: RawAlbum
  duration?: { totalMilliseconds: number }
  trackDuration?: { totalMilliseconds: number }
  playability?: { playable: boolean }
}

interface RawAlbum {
  uri?: string
  id?: string
  name?: string
  coverArt?: { sources: RawImage[] }
  tracksV2?: { items: { track: RawTrack }[]; totalCount: number }
  tracks?: { items: RawTrack[]; totalCount: number }
}

interface RawPlaylist {
  uri?: string
  name?: string
  description?: string
  ownerV2?: { data?: { name?: string } }
  images?: { items: { sources: RawImage[] }[] }
  content?: {
    items: { itemV2?: { data: RawTrack }; item?: { data: RawTrack } }[]
    totalCount: number
  }
}

interface RawSearch {
  searchV2: {
    tracksV2?: {
      items: { item: { data: RawTrack } }[]
    }
    playlists?: {
      items: { data: RawPlaylist }[]
    }
  }
}

interface RawRecommendationWrapper {
  items?: ({ data?: RawTrack; item?: { data: RawTrack } } | RawTrack)[]
}

interface RawDataResponse {
  data?: {
    playlistV2?: RawPlaylist
    albumUnion?: RawAlbum
    album?: RawAlbum
    trackUnion?: RawTrack
    track?: RawTrack
    internalLinkRecommenderTrack?: RawRecommendationWrapper
    seoRecommendedTrack?: RawRecommendationWrapper
  }
}

// --- Utils: ID Extractors ---

function extractId(input: string | undefined, type: SpotifyType): string {
  if (!input) return ''
  const decoded = decodeURIComponent(input).trim()
  const clean = (decoded.split(/[?#&]/)[0] || '').replace(/\/$/, '')

  const uriMatch = clean.match(new RegExp(`spotify:${type}:([A-Za-z0-9]+)`))
  if (uriMatch) return uriMatch[1] || ''

  const urlMatch = clean.match(new RegExp(`${type}\\/([A-Za-z0-9]+)`))
  if (urlMatch) return urlMatch[1] || ''

  try {
    const u = new URL(clean)
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.indexOf(type)
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1] || ''
  } catch {
    // ignore
  }

  const idMatch = clean.match(/^([A-Za-z0-9_-]{8,})$/)
  return idMatch ? idMatch[1] || '' : clean
}

export const extractPlaylistId = (input?: string) => extractId(input, 'playlist')
export const extractAlbumId = (input?: string) => extractId(input, 'album')
export const extractTrackId = (input?: string) => extractId(input, 'track')

// --- Utils: Detect Spotify Type ---

export function detectSpotifyType(input: string): SpotifyType | null {
  const decoded = decodeURIComponent(input).trim()
  if (/spotify:track:|\/track\//.test(decoded)) return 'track'
  if (/spotify:album:|\/album\//.test(decoded)) return 'album'
  if (/spotify:playlist:|\/playlist\//.test(decoded)) return 'playlist'
  return null
}

// --- Utils: Helpers ---

// --- Utils: Helpers ---

function getBiggestImage(images: RawImage[]): RawImage | undefined {
  if (!images || images.length === 0) return undefined
  return images.reduce((prev, curr) => ((prev.width || 0) > (curr.width || 0) ? prev : curr))
}

function formatImage(img: RawImage | undefined) {
  if (!img) return []
  return [{ url: img.url, height: img.height, width: img.width }]
}

function mapArtists(items: RawArtist[]): { id: string; name: string }[] {
  return (
    items?.map((a) => ({
      id: a.uri?.split(':').pop() || a.id || '',
      name: a.profile?.name || a.name || ''
    })) || []
  )
}

function mapTrack(
  track: RawTrack | undefined,
  albumOverride?: RawAlbum | { uri: string; name: string; coverArt: { sources: RawImage[] } }
): SpotifyTrack | null {
  if (!track) return null
  const album = (albumOverride as RawAlbum) || track.albumOfTrack
  const albumImage = getBiggestImage(album?.coverArt?.sources || [])

  return {
    id: track.uri?.split(':').pop() || track.id || '',
    name: track.name || '',
    artists: mapArtists(track.artists?.items || []),
    album: {
      id: album?.uri?.split(':').pop() || album?.id || '',
      name: album?.name || '',
      images: formatImage(albumImage)
    },
    duration_ms: track.duration?.totalMilliseconds || track.trackDuration?.totalMilliseconds || 0,
    preview_url: null,
    is_playable: track.playability?.playable ?? true
  }
}

// --- Transformers ---

// --- Transformers ---

function transformPlaylistResponse(response: unknown): SpotifyPlaylist {
  const data = (response as RawDataResponse)?.data
  const playlist = data?.playlistV2
  if (!playlist) throw new Error('Invalid playlist data format')

  const rawItems = playlist.content?.items || []
  const tracks = rawItems
    .map((item) => {
      const track = item.itemV2?.data || item.item?.data
      return mapTrack(track)
    })
    .filter(Boolean) as SpotifyTrack[]

  const playlistImage = getBiggestImage(playlist.images?.items?.[0]?.sources || [])

  return {
    id: playlist.uri?.split(':').pop() || '',
    name: playlist.name || '',
    description: playlist.description || '',
    images: formatImage(playlistImage),
    tracks: {
      items: tracks,
      total: playlist.content?.totalCount || tracks.length
    }
  }
}

function transformAlbumResponse(response: unknown): SpotifyPlaylist {
  const data = (response as RawDataResponse)?.data
  const album = data?.albumUnion || data?.album
  if (!album) throw new Error('Invalid album data format')

  const rawItems = album.tracksV2?.items || album.tracks?.items || []
  const tracks = rawItems
    .map((item) => {
      const track = 'track' in item ? (item as { track: RawTrack }).track : (item as RawTrack)
      return mapTrack(track, {
        uri: album.uri,
        name: album.name,
        coverArt: album.coverArt
      })
    })
    .filter(Boolean) as SpotifyTrack[]

  const coverArt = getBiggestImage(album.coverArt?.sources || [])

  return {
    id: album.uri?.split(':').pop() || '',
    name: album.name || '',
    description: '',
    images: formatImage(coverArt),
    tracks: {
      items: tracks,
      total: album.tracksV2?.totalCount || tracks.length
    }
  }
}

function transformTrackResponse(response: unknown): SpotifyTrack {
  const data = (response as RawDataResponse)?.data
  const track = data?.trackUnion || data?.track
  if (!track) throw new Error('Invalid track data format')
  const result = mapTrack(track)
  if (!result) throw new Error('Failed to map track data')
  return result
}

function transformRecommendationsResponse(
  response: unknown,
  seedTrackId: string
): SpotifyRecommendations {
  const data = (response as RawDataResponse)?.data
  const wrapper = data?.internalLinkRecommenderTrack || data?.seoRecommendedTrack
  if (!wrapper) throw new Error('Invalid recommendation data format')

  const tracks = (wrapper.items || [])
    .map((item) => {
      // Check for wrapper structures first
      if ('data' in item) return mapTrack((item as { data: RawTrack }).data)
      if ('item' in item) return mapTrack((item as { item: { data: RawTrack } }).item?.data)
      return mapTrack(item as RawTrack)
    })
    .filter(Boolean) as SpotifyTrack[]

  return {
    seeds: [{ id: seedTrackId, type: 'TRACK', href: null }],
    tracks
  }
}

// --- Token Handler ---

class SpotifyTokenHandler {
  private cacheFile = path.join(process.cwd(), '.spotify-token-cache.json')
  private accessToken: string | null = null
  private clientId: string | null = null
  private accessTokenExpirationTimestampMs = 0
  private isAnonymous = true

  private browser: Browser | null = null
  private context: BrowserContext | null = null
  private page: Page | null = null
  private refreshTimeout: NodeJS.Timeout | null = null

  constructor() {
    this.loadCache()
  }

  private loadCache() {
    if (!fs.existsSync(this.cacheFile)) return
    try {
      const data = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'))
      if (data.accessToken && data.accessTokenExpirationTimestampMs > Date.now()) {
        this.accessToken = data.accessToken
        this.clientId = data.clientId
        this.accessTokenExpirationTimestampMs = data.accessTokenExpirationTimestampMs
        this.isAnonymous = data.isAnonymous
        logger.info(
          `[Spotify:Token] Successfully restored valid token from local cache (.spotify-token-cache.json)`
        )
        this.scheduleRefresh()
      } else {
        logger.debug(`[Spotify:Token] Local token cache is empty or expired.`)
      }
    } catch (e) {
      logger.error(
        '[Spotify:Token] Failed to parse local token cache file. Proceeding without cache.',
        e
      )
    }
  }

  private saveCache() {
    try {
      fs.writeFileSync(
        this.cacheFile,
        JSON.stringify(
          {
            accessToken: this.accessToken,
            clientId: this.clientId,
            accessTokenExpirationTimestampMs: this.accessTokenExpirationTimestampMs,
            isAnonymous: this.isAnonymous
          },
          null,
          2
        )
      )
      logger.debug(`[Spotify:Token] Saved newly generated access token to cache.`)
    } catch (e) {
      logger.error('[Spotify:Token] Failed to write token cache file to disk.', e)
    }
  }

  private scheduleRefresh() {
    if (this.refreshTimeout) clearTimeout(this.refreshTimeout)
    if (!this.accessToken) return

    const now = Date.now()
    const expiresIn = this.accessTokenExpirationTimestampMs - now
    const refreshIn = Math.max(expiresIn - 10000, 0) // trigger 10 seconds before actually expired

    this.refreshTimeout = setTimeout(async () => {
      try {
        logger.info(
          '[Spotify:Token] Token is about to expire (< 10s). Executing background auto-refresh...'
        )
        const newToken = await this.refreshToken()
        this.accessToken = newToken.accessToken
      } catch (err) {
        logger.warn('[Spotify:Token] Failed to auto-refresh Spotify token in background', err)
      }
      this.scheduleRefresh()
    }, refreshIn)
  }

  private async launchBrowser() {
    if (this.browser) return
    logger.info(
      '[Spotify:Playwright] Launching headless chromium instance to obtain anonymous token...'
    )
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ]
    })
    this.context = await this.browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 720 }
    })
    await this.context.route('**/*', (route) => {
      const type = route.request().resourceType()
      if (['image', 'font', 'stylesheet', 'media'].includes(type)) {
        return route.abort()
      }
      return route.continue()
    })
    this.page = await this.context.newPage()
  }

  private async closeBrowser() {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.context = null
      this.page = null
    }
  }

  private fetchTokenPromise: Promise<SpotifyToken> | null = null

  public async getAccessToken(forceRefresh = false): Promise<SpotifyToken> {
    if (
      !forceRefresh &&
      this.accessToken &&
      this.accessTokenExpirationTimestampMs - 10000 > Date.now()
    ) {
      return {
        accessToken: this.accessToken!,
        clientId: this.clientId!,
        accessTokenExpirationTimestampMs: this.accessTokenExpirationTimestampMs,
        isAnonymous: this.isAnonymous
      }
    }

    if (this.fetchTokenPromise && !forceRefresh) {
      return this.fetchTokenPromise
    }

    this.fetchTokenPromise = this._getAccessTokenWithRetries()
    try {
      return await this.fetchTokenPromise
    } finally {
      this.fetchTokenPromise = null
    }
  }

  private async _getAccessTokenWithRetries(): Promise<SpotifyToken> {
    // Retry up to 2 times — Playwright cold start on first launch can be slow
    const maxRetries = 2
    let lastError: unknown
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(
          `[Spotify:Playwright] Attempting to fetch new token (Attempt ${attempt}/${maxRetries})...`
        )
        return await this.fetchNewToken()
      } catch (err) {
        lastError = err
        logger.warn(
          `[Spotify:Playwright] Token fetch attempt ${attempt}/${maxRetries} failed. Retrying if possible.`,
          err
        )
      }
    }
    throw lastError
  }

  public async refreshToken(): Promise<SpotifyToken> {
    logger.info('[Spotify:Token] Forcing token refresh. Clearing cache and opening Chromium...')
    this.accessToken = null
    this.accessTokenExpirationTimestampMs = 0
    return this.getAccessToken(true)
  }

  private async fetchNewToken(): Promise<SpotifyToken> {
    await this.launchBrowser()
    if (!this.page || !this.context) throw new Error('Browser page not initialized')

    let timeout: NodeJS.Timeout | null = null
    try {
      logger.debug(
        '[Spotify:Playwright] Navigating to https://open.spotify.com/ to sniff token from network requests...'
      )

      await this.context.route('**/*', (route) => {
        const url = route.request().url()
        const type = route.request().resourceType()
        const blockedTypes = ['image', 'stylesheet', 'font', 'media', 'websocket', 'other']
        const blockedPatterns = [
          'google-analytics',
          'doubleclick.net',
          'googletagmanager.com',
          'open.spotifycdn.com/cdn/images/',
          'encore.scdn.co/fonts/'
        ]
        if (blockedTypes.includes(type) || blockedPatterns.some((p) => url.includes(p))) {
          return route.abort()
        }
        return route.continue()
      })

      const tokenPromise = new Promise<SpotifyToken>((resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Token fetch timeout')), 30000)

        const handler = async (response: Response) => {
          if (!response.url().includes('/api/token')) return
          try {
            const json = await response.json()
            if (json?.accessToken) {
              this.page?.off('response', handler)
              if (timeout) clearTimeout(timeout)
              resolve(json as SpotifyToken)
            }
          } catch {
            // ignore
          }
        }

        this.page?.on('response', handler)
      })

      await this.page.goto('https://open.spotify.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      const token = await tokenPromise
      if (!token?.accessToken) throw new Error('Could not retrieve access token.')

      this.accessToken = token.accessToken
      this.clientId = token.clientId
      this.accessTokenExpirationTimestampMs =
        token.accessTokenExpirationTimestampMs || Date.now() + (token.expiresIn || 3600) * 1000
      this.isAnonymous = token.isAnonymous

      logger.info(
        `[Spotify:Playwright] Token successfully sniffed and retrieved. (Expires in: ${Math.round((this.accessTokenExpirationTimestampMs - Date.now()) / 1000)}s)`
      )
      this.saveCache()
      this.scheduleRefresh()

      return {
        accessToken: this.accessToken!,
        clientId: this.clientId!,
        accessTokenExpirationTimestampMs: this.accessTokenExpirationTimestampMs,
        isAnonymous: this.isAnonymous
      }
    } catch (error) {
      logger.error(
        '[Spotify:Playwright] Fatal error occurred during token fetching process. Could not resolve token.',
        error
      )
      throw error
    } finally {
      if (timeout) clearTimeout(timeout)
      await this.closeBrowser()
    }
  }
}

const spotifyTokenHandler = new SpotifyTokenHandler()

// --- API Helper ---

async function partnerQuery(
  operationName: keyof typeof HASHES,
  variables: Record<string, unknown>,
  isRetry = false
): Promise<unknown> {
  const token = await spotifyTokenHandler.getAccessToken(isRetry)
  try {
    const response = await fetch(SPOTIFY_API_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT
      },
      body: JSON.stringify({
        variables,
        operationName,
        extensions: {
          persistedQuery: { version: 1, sha256Hash: HASHES[operationName] }
        }
      })
    })

    if (!response.ok) {
      if (response.status === 401 && !isRetry) {
        logger.warn(
          `[Spotify:API] Received 401 Unauthorized for ${operationName}. Token likely revoked early by Spotify. Triggering immediate Force Refresh...`
        )
        return partnerQuery(operationName, variables, true)
      }

      throw new Error(
        `Spotify API Error [${operationName}]: ${response.status} ${response.statusText}`
      )
    }

    return await response.json()
  } catch (error) {
    if (!isRetry) {
      logger.warn(
        `[Spotify:API] Network error during ${operationName}, retrying once. Details:`,
        error
      )
      return partnerQuery(operationName, variables, true)
    }

    logger.error(`[Spotify:API] Fatal network error during ${operationName}:`, error)
    throw new Error(
      `Spotify API Network Error [${operationName}]: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { cause: error }
    )
  }
}

// --- Service Functions ---

export async function fetchPlaylist(playlistId: string, limit?: number): Promise<SpotifyPlaylist> {
  const batchSize = 150
  const firstBatch = limit ? Math.min(limit, batchSize) : batchSize

  const initial = await _fetchPlaylistBatch(playlistId, firstBatch, 0)
  const tracks = initial.tracks.items
  const total = limit ? Math.min(limit, initial.tracks.total) : initial.tracks.total

  if (tracks.length >= total) {
    initial.tracks.items = tracks.slice(0, total)
    return initial
  }

  const remaining = total - tracks.length
  const batches = Math.ceil(remaining / batchSize)
  const promises: Promise<SpotifyPlaylist>[] = []

  for (let i = 0; i < batches; i++) {
    const batchOffset = tracks.length + i * batchSize
    const batchLimit = Math.min(batchSize, remaining - i * batchSize)
    promises.push(_fetchPlaylistBatch(playlistId, batchLimit, batchOffset))
  }

  const results = await Promise.all(promises)
  for (const res of results) {
    tracks.push(...res.tracks.items)
  }

  initial.tracks.items = tracks.slice(0, total)
  return initial
}

async function _fetchPlaylistBatch(
  playlistId: string,
  limit: number,
  offset: number
): Promise<SpotifyPlaylist> {
  logger.debug(
    `[Spotify:API] Fetching Playlist Batch (ID: ${playlistId} | Limit: ${limit} | Offset: ${offset})`
  )
  const data = await partnerQuery('fetchPlaylist', {
    uri: `spotify:playlist:${playlistId}`,
    enableWatchFeedEntrypoint: false,
    limit,
    offset
  })
  return transformPlaylistResponse(data)
}

export async function fetchAlbum(albumId: string, limit?: number): Promise<SpotifyPlaylist> {
  const batchSize = 50
  const firstBatch = limit ? Math.min(limit, batchSize) : batchSize

  const initial = await _fetchAlbumBatch(albumId, firstBatch, 0)
  const tracks = initial.tracks.items
  const total = limit ? Math.min(limit, initial.tracks.total) : initial.tracks.total

  if (tracks.length >= total) {
    initial.tracks.items = tracks.slice(0, total)
    return initial
  }

  const remaining = total - tracks.length
  const batches = Math.ceil(remaining / batchSize)
  const promises: Promise<SpotifyPlaylist>[] = []

  for (let i = 0; i < batches; i++) {
    const batchOffset = tracks.length + i * batchSize
    const batchLimit = Math.min(batchSize, remaining - i * batchSize)
    promises.push(_fetchAlbumBatch(albumId, batchLimit, batchOffset))
  }

  const results = await Promise.all(promises)
  for (const res of results) {
    tracks.push(...res.tracks.items)
  }

  initial.tracks.items = tracks.slice(0, total)
  return initial
}

async function _fetchAlbumBatch(
  albumId: string,
  limit: number,
  offset: number
): Promise<SpotifyPlaylist> {
  logger.debug(
    `[Spotify:API] Fetching Album Batch (ID: ${albumId} | Limit: ${limit} | Offset: ${offset})`
  )
  const data = await partnerQuery('getAlbum', {
    uri: `spotify:album:${albumId}`,
    locale: '',
    offset,
    limit
  })
  return transformAlbumResponse(data)
}

export async function fetchTrack(trackId: string): Promise<SpotifyTrack> {
  logger.debug(`[Spotify:API] Fetching standard track via partner query (ID: ${trackId})`)
  const data = await partnerQuery('getTrack', {
    uri: `spotify:track:${trackId}`
  })
  const track = transformTrackResponse(data)

  // getTrack doesn't return artists[] directly — enrich from album
  if ((!track.artists.length || !track.artists[0]?.name) && track.album?.id) {
    try {
      const album = await fetchAlbum(track.album.id)
      const match = album.tracks.items.find((t) => t.id === trackId)
      if (match?.artists.length) {
        track.artists = match.artists
      }
    } catch (e) {
      logger.warn(
        `[Spotify:API] Failed to implicitly enrich track artist info for track ${trackId} via album lookup.`,
        e
      )
    }
  }

  return track
}

export async function fetchRecommendations(
  trackId: string,
  limit = 5
): Promise<SpotifyRecommendations> {
  const data = await partnerQuery('internalLinkRecommenderTrack', {
    uri: `spotify:track:${trackId}`,
    limit
  })
  return transformRecommendationsResponse(data, trackId)
}

// --- Search Dispatcher ---

export async function searchSpotify(query: string, limit = 10): Promise<SpotifyTrack[]> {
  const result = (await partnerQuery('searchTracks', {
    searchTerm: query,
    offset: 0,
    limit,
    numberOfTopResults: limit,
    includeAudiobooks: false,
    includePreReleases: false,
    includeAuthors: false
  })) as { data: RawSearch }

  const items = result.data?.searchV2?.tracksV2?.items
  if (!items?.length) return []

  return items.map((item) => mapTrack(item.item.data)).filter((t): t is SpotifyTrack => t !== null)
}

export async function searchSpotifyPlaylists(
  query: string,
  limit = 10
): Promise<SpotifyPlaylist[]> {
  const result = (await partnerQuery('searchPlaylists', {
    searchTerm: query,
    offset: 0,
    limit,
    numberOfTopResults: limit,
    includeAudiobooks: true,
    includeAuthors: false,
    includePreReleases: false
  })) as { data: RawSearch }

  const items = result.data?.searchV2?.playlists?.items
  if (!items?.length) return []

  return items
    .map((item) => {
      const data = item.data
      const playlistImage = getBiggestImage(data.images?.items?.[0]?.sources || [])

      let description = data.description || ''
      if (!description && data.ownerV2?.data?.name) {
        description = `Theo ${data.ownerV2.data.name}`
      }

      return {
        id: data.uri?.split(':').pop() || '',
        name: data.name || '',
        description,
        images: formatImage(playlistImage),
        tracks: {
          items: [],
          total: 0
        }
      } as SpotifyPlaylist
    })
    .filter((p) => p.id !== '')
}

// --- Universal Dispatcher ---

export async function fetchSpotify(input: string): Promise<SpotifyResult> {
  const type = detectSpotifyType(input)
  if (!type) throw new Error(`Cannot detect Spotify type from: "${input}"`)

  switch (type) {
    case 'track':
      return fetchTrack(extractTrackId(input))
    case 'album':
      return fetchAlbum(extractAlbumId(input))
    case 'playlist':
      return fetchPlaylist(extractPlaylistId(input))
  }
}

// --- Token Exports ---

export async function getAccessToken(): Promise<SpotifyToken> {
  return spotifyTokenHandler.getAccessToken()
}

export async function refreshToken(): Promise<SpotifyToken> {
  return spotifyTokenHandler.refreshToken()
}
