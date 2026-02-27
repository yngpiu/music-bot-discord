// Command to insert a track or playlist at a specific position in the queue.
import type { GuildMember, Message, VoiceChannel } from 'discord.js'

import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import { isSpotifyQuery, spotifySearch } from '~/lib/spotify/resolver.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'
import { getBotAvatar } from '~/utils/stringUtil.js'

// Command to add tracks to a specific index in the queue.
class InsertCommand extends BaseCommand {
  name = 'insert'
  aliases = ['i', 'add', 'playnext', 'pn']
  description = 'Chèn một bài hát hoặc danh sách phát vào vị trí cụ thể trong danh sách chờ.'
  requiresVoice = true

  // Executes the insert command, searching for the track and placing it at the requested position.
  async execute(bot: BotClient, message: Message, args: string[]): Promise<void> {
    logger.info(
      `[Command: insert] User ${message.author.tag} requested to insert track at position ${args[0] || '?'}`
    )

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) {
      throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    }
    const vc = member.voice.channel as VoiceChannel
    if (!vc.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

    if (args.length < 2) {
      throw new BotError(
        'Vui lòng nhập vị trí và tên bài hát/đường dẫn. (VD: `insert 1 Nơi này có anh`)'
      )
    }

    // Extract position and query.
    const positionStr = args.shift()
    const position = parseInt(positionStr || '', 10)

    if (isNaN(position) || position < 1) {
      throw new BotError('Vị trí chèn không hợp lệ, vui lòng nhập số lớn hơn 0.')
    }

    const query = args.join(' ')
    if (!query) {
      throw new BotError('Vui lòng nhập tên/đường dẫn bài hát.')
    }
    const player =
      bot.lavalink.getPlayer(message.guild!.id) ??
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

    // Set initial owner if not defined.
    if (!player.get('owner')) {
      player.set('owner', message.author.id)
    }

    // Adjust insert index to be within bounds.
    let insertIndex = position - 1
    if (insertIndex > player.queue.tracks.length) {
      insertIndex = player.queue.tracks.length
    }

    // Calculate estimated time until this track plays.
    let estimatedMsOverride = 0
    if (player.playing) {
      estimatedMsOverride += Math.max(
        0,
        (player.queue.current?.info.duration ?? 0) - (player.position ?? 0)
      )

      for (let i = 0; i < insertIndex; i++) {
        const track = player.queue.tracks[i]

        const info =
          'info' in track
            ? track.info
            : (track as import('lavalink-client').Track | import('lavalink-client').UnresolvedTrack)
                .info
        estimatedMsOverride += info?.duration ?? 0
      }
    }

    // Search for tracks.
    const result = isSpotifyQuery(query)
      ? await spotifySearch(player, query, message.author)
      : await player.search({ query }, message.author)

    if (result.loadType === 'error') {
      throw new BotError(
        result.exception?.message ??
          'Tớ không tìm thấy bài hát nào, bạn hãy kiểm tra lại tên bài hát/đường dẫn hoặc sử dụng lệnh `search`.'
      )
    }
    if (!result.tracks.length)
      throw new BotError(
        'Tớ không tìm thấy bài hát nào, bạn hãy kiểm tra lại tên bài hát/đường dẫn hoặc sử dụng lệnh `search`.'
      )

    // Add to queue at specific index.
    if (result.loadType === 'playlist') {
      await player.queue.add(result.tracks, insertIndex)
    } else {
      await player.queue.add(result.tracks[0], insertIndex)
    }

    const positionOverride = player.playing ? insertIndex + 1 : 1

    // Build and send confirmation embed.
    const addedEmbed = buildAddedItemEmbed(
      result.loadType === 'playlist' ? 'playlist' : 'track',
      {
        title:
          result.loadType === 'playlist'
            ? (result.playlist?.title ?? 'Playlist')
            : result.tracks[0].info.title,
        tracks: result.loadType === 'playlist' ? result.tracks : [result.tracks[0]],
        thumbnailUrl:
          result.loadType === 'playlist'
            ? (result.playlist?.thumbnail ??
              ('info' in result.tracks[0] ? result.tracks[0].info.artworkUrl : null))
            : 'info' in result.tracks[0]
              ? result.tracks[0].info.artworkUrl
              : null,
        author: result.loadType === 'playlist' ? null : result.tracks[0].info.author,
        trackLink:
          result.loadType === 'playlist'
            ? undefined
            : (result.tracks[0].info.uri ?? 'https://github.com/yngpiu'),
        playlistLink:
          result.loadType === 'playlist'
            ? query.startsWith('http')
              ? query
              : undefined
            : undefined,
        authorLink:
          result.loadType === 'playlist' ? null : (result.tracks[0]?.pluginInfo?.artistUrl ?? null)
      },
      player,
      message.author,
      getBotAvatar(bot),
      positionOverride,
      estimatedMsOverride
    )

    const replyMessage = await message.reply(addedEmbed)

    deleteMessage([replyMessage, message], TIME.MEDIUM)

    // Auto-play if nothing is currently playing.
    if (!player.playing) await player.play()
  }
}

export default new InsertCommand()
