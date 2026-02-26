import type { Message, VoiceChannel } from 'discord.js'
import type { Player, SearchResult, UnresolvedSearchResult } from 'lavalink-client'

import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import { isSpotifyQuery, spotifySearch } from '~/lib/spotify/resolver.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

class PlayCommand extends BaseCommand {
  name = 'play'
  aliases = ['p']
  description = 'Phát một bài hát hoặc danh sách phát.'

  // ─── Helpers ────────────────────────────────────────────────────────────

  private validateVoiceChannel(message: Message, vcId: string): void {
    const vc = message.guild!.channels.cache.get(vcId) as VoiceChannel
    if (!vc?.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')
  }

  private async getOrCreatePlayer(
    bot: BotClient,
    message: Message,
    vcId: string,
    existingPlayer: Player | null
  ): Promise<Player> {
    const player =
      existingPlayer ??
      bot.lavalink.createPlayer({
        guildId: message.guild!.id,
        voiceChannelId: vcId,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100,
        instaUpdateFiltersFix: true
      })

    if (!player.connected) await player.connect()
    if (player.voiceChannelId !== vcId) throw new BotError('Bạn không ở cùng kênh thoại với tớ.')
    if (!player.get('owner')) player.set('owner', message.author.id)

    return player
  }

  private async searchQuery(
    player: Player,
    message: Message,
    query: string
  ): Promise<SearchResult | UnresolvedSearchResult> {
    const result = isSpotifyQuery(query)
      ? await spotifySearch(player, query, message.author)
      : await player.search({ query }, message.author)

    if (result.loadType === 'error') {
      throw new BotError(
        result.exception?.message ??
          'Tớ không tìm thấy bài hát nào, bạn hãy kiểm tra lại tên bài hát/đường dẫn hoặc sử dụng lệnh `search`.'
      )
    }
    if (!result.tracks.length) {
      throw new BotError(
        'Tớ không tìm thấy bài hát nào, bạn hãy kiểm tra lại tên bài hát/đường dẫn hoặc sử dụng lệnh `search`.'
      )
    }

    return result
  }

  private buildEmbed(
    bot: BotClient,
    message: Message,
    player: Player,
    result: SearchResult | UnresolvedSearchResult,
    query: string
  ) {
    const isPlaylist = result.loadType === 'playlist'
    const firstTrack = result.tracks[0]

    return buildAddedItemEmbed(
      isPlaylist ? 'playlist' : 'track',
      {
        title: isPlaylist ? (result.playlist?.title ?? 'Playlist') : firstTrack.info.title,
        tracks: isPlaylist ? result.tracks : [firstTrack],
        thumbnailUrl: isPlaylist
          ? (result.playlist?.thumbnail ??
            ('info' in firstTrack ? firstTrack.info.artworkUrl : null))
          : 'info' in firstTrack
            ? firstTrack.info.artworkUrl
            : null,
        author: isPlaylist ? null : firstTrack.info.author,
        trackLink: isPlaylist ? undefined : (firstTrack.info.uri ?? 'https://github.com/yngpiu'),
        playlistLink: isPlaylist ? (query.startsWith('http') ? query : undefined) : undefined,
        authorLink: isPlaylist ? null : (firstTrack?.pluginInfo?.artistUrl ?? null)
      },
      player,
      message.author,
      bot.user?.displayAvatarURL()
    )
  }

  // ─── Execute ────────────────────────────────────────────────────────────

  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { vcId, player: existingPlayer }: CommandContext
  ) {
    logger.info(
      `[Command: play] User ${message.author.tag} requested to play track in server ${message.guild!.id}`
    )

    const query = args.join(' ')
    if (!query) throw new BotError('Vui lòng nhập tên/đường dẫn bài hát.')

    if (!vcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    this.validateVoiceChannel(message, vcId)

    const player = await this.getOrCreatePlayer(bot, message, vcId, existingPlayer)
    const result = await this.searchQuery(player, message, query)

    if (result.loadType === 'playlist') {
      await player.queue.add(result.tracks)
    } else {
      await player.queue.add(result.tracks[0])
    }

    const addedEmbed = this.buildEmbed(bot, message, player, result, query)
    const replyMessage = await message.reply(addedEmbed)
    deleteMessage([replyMessage, message], TIME.MEDIUM)

    if (!player.playing) {
      await player.play().catch((err: Error) => {
        logger.error(
          `[Command: play] Error auto-starting playback in server ${message.guild!.id}:`,
          err
        )
      })
    }
  }
}

export default new PlayCommand()
