import type { GuildMember, Message, VoiceChannel } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'
import { buildAddedItemEmbed } from '~/lib/embeds.js'
import { isSpotifyQuery, spotifySearch } from '~/lib/spotify/resolver.js'

const command: Command = {
  name: 'insert',
  aliases: ['i', 'add'],
  description: 'Chèn một bài hát hoặc danh sách phát vào vị trí cụ thể trong danh sách chờ',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) throw new BotError('Bạn phải vào kênh thoại trước.')

    const vc = member.voice.channel as VoiceChannel
    if (!vc.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')

    if (args.length < 2) {
      throw new BotError(
        'Vui lòng nhập vị trí và tên bài hát/đường dẫn. (VD: `!insert 1 Nơi này có anh`)'
      )
    }

    const positionStr = args.shift()
    const position = parseInt(positionStr || '', 10)

    if (isNaN(position) || position < 1) {
      throw new BotError('Vị trí chèn không hợp lệ. Vui lòng nhập số lớn hơn 0.')
    }

    const query = args.join(' ')
    if (!query) throw new BotError('Vui lòng nhập tên bài hát hoặc đường dẫn.')

    // Get or create player
    const player =
      bot.lavalink.getPlayer(message.guild.id) ??
      bot.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: vcId,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100,
        instaUpdateFiltersFix: true
      })

    if (!player.connected) await player.connect()
    if (player.voiceChannelId !== vcId) throw new BotError('Bạn phải ở trong kênh thoại của tớ.')

    if (!player.get('owner')) {
      player.set('owner', message.author.id)
    }

    // Adjust position if it exceeds the queue length.
    // Index is 0-based for the tracks array.
    // If the queue has 3 tracks, inserting at position 1 (index 0) is valid.
    // Inserting at position 100 (index 99) should just append.
    let insertIndex = position - 1
    if (insertIndex > player.queue.tracks.length) {
      insertIndex = player.queue.tracks.length
    }

    // Calculate estimated wait time before adding the track
    let estimatedMsOverride = 0
    if (player.playing) {
      // Time remaining for the current playing track
      estimatedMsOverride += Math.max(
        0,
        (player.queue.current?.info.duration ?? 0) - (player.position ?? 0)
      )
      // Add duration of all tracks BEFORE the insert index
      for (let i = 0; i < insertIndex; i++) {
        const track = player.queue.tracks[i]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const info = 'info' in track ? track.info : (track as any).info
        estimatedMsOverride += info?.duration ?? 0
      }
    }

    const result = isSpotifyQuery(query)
      ? await spotifySearch(player, query, message.author)
      : await player.search({ query }, message.author)

    if (result.loadType === 'error') {
      throw new BotError(result.exception?.message ?? 'Tớ không tìm thấy bài hát nào.')
    }
    if (!result.tracks.length) throw new BotError('Tớ không tìm thấy bài hát nào.')

    if (result.loadType === 'playlist') {
      await player.queue.add(result.tracks, insertIndex)
    } else {
      await player.queue.add(result.tracks[0], insertIndex)
    }

    // The visually displayed position is insertIndex + 1
    // If we're not playing yet, position is just 1 (it's the current track)
    const positionOverride = player.playing ? insertIndex + 1 : 1

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
      bot.user?.displayAvatarURL(),
      positionOverride,
      estimatedMsOverride
    )

    await message.reply(addedEmbed)

    if (!player.playing) await player.play()
  }
}

export default command
