/**
 * @file play.ts
 * @description Main command to search for and play tracks or playlists from various sources.
 */
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

/**
 * Command for searching and playing music.
 */
class PlayCommand extends BaseCommand {
  name = 'play'
  aliases = ['p']
  description = 'Phát một bài hát hoặc danh sách phát.'

  /**
   * Validates if the bot can join the requested voice channel.
   * @param {Message} message - The command message.
   * @param {string} vcId - The ID of the voice channel.
   * @throws {BotError} - If the channel is not joinable.
   */
  private validateVoiceChannel(message: Message, vcId: string): void {
    const vc = message.guild!.channels.cache.get(vcId) as VoiceChannel
    if (!vc?.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')
  }

  /**
   * Retrieves an existing player or creates a new one for the guild.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string} vcId - The target voice channel ID.
   * @param {Player | null} existingPlayer - The existing player instance, if any.
   * @returns {Promise<Player>} - The active player instance.
   */
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

    // Ensure the player is in the same channel as the user.
    if (player.voiceChannelId !== vcId) throw new BotError('Bạn không ở cùng kênh thoại với tớ.')

    // Set initial owner if not defined.
    if (!player.get('owner')) player.set('owner', message.author.id)

    return player
  }

  /**
   * Searches for tracks based on the query, using Spotify resolver if necessary.
   * @param {Player} player - The player instance.
   * @param {Message} message - The command message.
   * @param {string} query - The search query or URL.
   * @returns {Promise<SearchResult | UnresolvedSearchResult>} - The search results.
   * @throws {BotError} - If no tracks are found or an error occurs.
   */
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

  /**
   * Builds the "Track Added" embed.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {Player} player - The player instance.
   * @param {SearchResult | UnresolvedSearchResult} result - The search result.
   * @param {string} query - The original search query.
   * @returns {EmbedBuilder} - The constructed embed.
   */
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

  /**
   * Executes the play command.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} args - Command arguments (the query).
   * @param {CommandContext} context - The command execution context.
   */
  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { vcId, player: existingPlayer }: CommandContext
  ): Promise<void> {
    logger.info(
      `[Command: play] User ${message.author.tag} requested to play track in server ${message.guild!.id}`
    )

    const query = args.join(' ')
    if (!query) throw new BotError('Vui lòng nhập tên/đường dẫn bài hát.')

    if (!vcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    this.validateVoiceChannel(message, vcId)

    const player = await this.getOrCreatePlayer(bot, message, vcId, existingPlayer)
    const result = await this.searchQuery(player, message, query)

    // Add search results (tracks or playlist) to the queue.
    if (result.loadType === 'playlist') {
      await player.queue.add(result.tracks)
    } else {
      await player.queue.add(result.tracks[0])
    }

    const addedEmbed = this.buildEmbed(bot, message, player, result, query)
    const replyMessage = await message.reply(addedEmbed)
    deleteMessage([replyMessage, message], TIME.MEDIUM)

    // Automatically start playback if not already playing.
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
