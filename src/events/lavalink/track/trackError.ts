import { Player, Track, TrackExceptionEvent, UnresolvedTrack } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (
  bot: BotClient,
  player: Player,
  track: Track | UnresolvedTrack | null,
  payload: TrackExceptionEvent
) => {
  logger.error(
    `[Lavalink:Player] ${player.guildId} :: ERROR: Encountered a fatal exception while playing track. Details: ${JSON.stringify(payload)}`
  )

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  // Dynamic import to avoid circular dependencies if BotManager imports this file
  const { EmbedBuilder } = await import('discord.js')

  const embed = new EmbedBuilder()
    .setColor('Red')
    .setTitle('❌ Lỗi phát nhạc')
    .setDescription(
      `Không thể phát bài: **${track?.info?.title ?? 'Unknown Track'}**\nLỗi: \`${String(payload.error || payload.exception?.message || 'Unknown Error')}\``
    )
    .setTimestamp()

  await (channel as import('discord.js').TextChannel).send({ embeds: [embed] }).catch(() => null)
}
