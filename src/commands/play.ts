import type { GuildMember, Message, VoiceChannel } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import { BotError } from '~/core/errors.js'
import { buildAddedPlaylistEmbed, buildAddedTrackEmbed } from '~/lib/embeds.js'
import { isSpotifyQuery, spotifySearch } from '~/lib/spotify/resolver.js'

import { sendLoadingMessage } from '~/utils/messageUtil.js'

const command: Command = {
  name: 'play',
  aliases: ['p'],
  description: 'Play a song or playlist',
  requiresVoice: true,

  async execute(bot: BotClient, message: Message, args: string[]) {
    if (!message.guild) return

    const member = message.member as GuildMember
    const vcId = member?.voice?.channelId
    if (!vcId) throw new BotError('Bạn phải vào kênh voice trước!')

    const vc = member.voice.channel as VoiceChannel
    if (!vc.joinable) throw new BotError('Tôi không thể vào kênh voice của bạn!')

    const query = args.join(' ')
    if (!query) throw new BotError('Vui lòng nhập tên bài hát hoặc đường link!')

    // Reply loading immediately
    const loadingMsg = await sendLoadingMessage(message)

    // Get or create player
    const player =
      bot.lavalink.getPlayer(message.guild.id) ??
      (await bot.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: vcId,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 80,
        instaUpdateFiltersFix: true
      }))

    if (!player.connected) await player.connect()
    if (player.voiceChannelId !== vcId) throw new BotError('Bạn phải ở trong kênh voice của tôi!')

    if (!player.get('owner')) {
      player.set('owner', message.author.id)
    }

    // Search — Spotify is handled by our custom resolver, everything else by Lavalink natively
    const result = isSpotifyQuery(query)
      ? await spotifySearch(player, query, message.author)
      : await player.search({ query }, message.author)

    if (result.loadType === 'error') {
      throw new BotError(result.exception?.message ?? 'Không tìm thấy kết quả!')
    }
    if (!result.tracks.length) throw new BotError('Không tìm thấy kết quả!')

    if (result.loadType === 'playlist') {
      await player.queue.add(result.tracks)
      const thumbnail =
        result.playlist?.thumbnail ??
        ('info' in result.tracks[0] ? result.tracks[0].info.artworkUrl : null)

      const isFirstPlay = !player.playing && player.queue.tracks.length === result.tracks.length
      if (isFirstPlay) {
        await loadingMsg.delete().catch(() => {})
      } else {
        await loadingMsg.edit(
          buildAddedPlaylistEmbed(result.playlist?.title ?? 'Playlist', result.tracks, thumbnail)
        )
      }
    } else {
      const track = result.tracks[0]
      const isFirstPlay = !player.playing && player.queue.tracks.length === 0

      await player.queue.add(track)

      if (isFirstPlay) {
        await loadingMsg.delete().catch(() => {})
      } else {
        await loadingMsg.edit(
          buildAddedTrackEmbed(track, player, message.member?.user ?? message.author)
        )
      }
    }

    if (!player.playing) await player.play()
  }
}

export default command
