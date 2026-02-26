import type { GuildMember, Message, VoiceChannel } from 'discord.js'

import { TIME } from '~/constants/time.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import { isSpotifyQuery, spotifySearch } from '~/lib/spotify/resolver.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'play',
  aliases: ['p'],
  description: 'Phát một bài hát hoặc danh sách phát.',

  async execute(bot: BotClient, message: Message, args: string[]) {
    logger.info(
      `[Command: play] User ${message.author.tag} requested to play track in server ${message.guild!.id}`
    )

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) {
      throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    }
    const vc = member.voice.channel as VoiceChannel
    if (!vc.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

    const query = args.join(' ')
    if (!query) {
      throw new BotError('Vui lòng nhập tên/đường dẫn bài hát.')
    } // Get or create player
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

    if (!player.get('owner')) {
      player.set('owner', message.author.id)
    }

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

    if (result.loadType === 'playlist') {
      await player.queue.add(result.tracks)
    } else {
      await player.queue.add(result.tracks[0])
    }

    // Send Embed always
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
      bot.user?.displayAvatarURL()
    )

    const replyMessage = await message.reply(addedEmbed)

    deleteMessage([replyMessage, message], TIME.MEDIUM)

    if (!player.playing)
      await player.play().catch((err: Error) => {
        logger.error(
          `[Command: play] Error auto-starting playback in server ${message.guild!.id}:`,
          err
        )
      })
  }
}

export default command
