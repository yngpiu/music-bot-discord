// Command for managing the dedicated Lofi bot.
import type { EmbedBuilder, Message, VoiceChannel } from 'discord.js'
import type { Player, SearchResult, UnresolvedSearchResult } from 'lavalink-client'

import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import { isSpotifyQuery, spotifySearch } from '~/lib/spotify/resolver.js'

import { logger } from '~/utils/logger.js'
import {
  safeReplyMessage,
  safeReplySuccessMessage,
  sendTypingMessage
} from '~/utils/messageUtil.js'
import { isDeveloperOrServerOwner } from '~/utils/permissionUtil.js'
import { getBotAvatar, getBotName } from '~/utils/stringUtil.js'

class LofiCommand extends BaseCommand {
  name = 'lofi'
  description = 'Phát nhạc lofi 24/7. Dùng `lofi <link>` để phát hoặc `lofi reset` để xóa hàng đợi.'

  // Validates if the bot can join the requested voice channel.
  private validateVoiceChannel(bot: BotClient, message: Message, vcId: string): void {
    const vc = message.guild!.channels.cache.get(vcId) as VoiceChannel
    if (!vc?.joinable) throw new BotError(`${getBotName(bot)} không thể vào kênh thoại của bạn.`)
  }

  // Retrieves an existing player or creates a new one for the guild.
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

    if (player.voiceChannelId !== vcId)
      throw new BotError(`Bạn không ở cùng kênh thoại với ${getBotName(bot)}.`)

    if (!player.getData('owner')) player.setData('owner', message.author.id)

    return player
  }

  // Searches for tracks based on the query.
  private async searchQuery(
    bot: BotClient,
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
          `${getBotName(bot)} không tìm thấy bài hát nào, bạn hãy kiểm tra lại đường dẫn.`
      )
    }
    if (!result.tracks.length) {
      throw new BotError(
        `${getBotName(bot)} không tìm thấy bài hát nào, bạn hãy kiểm tra lại đường dẫn.`
      )
    }

    return result
  }

  // Builds the "Track Added" embed.
  private buildEmbed(
    bot: BotClient,
    message: Message,
    player: Player,
    result: SearchResult | UnresolvedSearchResult,
    query: string
  ): { embeds: EmbedBuilder[] } {
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
      getBotAvatar(bot)
    )
  }

  async execute(
    bot: BotClient,
    message: Message,
    args: string[],
    { vcId, player: existingPlayer }: CommandContext
  ): Promise<void> {
    if (!isDeveloperOrServerOwner(message)) {
      throw new BotError('Chỉ **Chủ Server** (Server Owner) mới có quyền điều khiển Lofi Bot.')
    }

    await sendTypingMessage(message)
    logger.info(`[Command: lofi] User ${message.author.tag} requested lofi command.`)

    const subCommand = args[0]?.toLowerCase()

    if (subCommand === 'reset') {
      if (!existingPlayer) throw new BotError(`${getBotName(bot)} đang không phát gì cả.`)
      await existingPlayer.queue.splice(0, existingPlayer.queue.tracks.length)
      await existingPlayer.stopPlaying()
      await safeReplySuccessMessage(message, `${getBotName(bot)} đã xóa toàn bộ hàng đợi lofi.`)
      return
    }

    const query = args.join(' ')
    if (!query)
      throw new BotError(
        'Vui lòng nhập đường dẫn bài hát, danh sách phát hoặc dùng lệnh `lofi reset`.'
      )

    if (!vcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    this.validateVoiceChannel(bot, message, vcId)

    const player = await this.getOrCreatePlayer(bot, message, vcId, existingPlayer)
    const result = await this.searchQuery(bot, player, message, query)

    if (result.loadType === 'playlist') {
      await player.queue.add(result.tracks)
    } else {
      await player.queue.add(result.tracks[0])
    }
    // Always loop the whole queue so it cycles back when finished
    await player.setRepeatMode('queue')

    const addedEmbed = this.buildEmbed(bot, message, player, result, query)
    await safeReplyMessage(
      message,
      {
        embeds: [addedEmbed.embeds[0] as EmbedBuilder],
        flags: ['SuppressNotifications']
      },
      TIME.MEDIUM
    )

    if (!player.playing) {
      await player.play().catch((err: Error) => {
        logger.error(`[Command: lofi] Error auto-starting playback:`, err)
      })
    }
  }
}

export default new LofiCommand()
