import { Player, Track, TrackStuckEvent } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export const name = 'trackStuck'

export const execute = async (
  bot: BotClient,
  player: Player,
  track: Track | null,
  payload: TrackStuckEvent
) => {
  logger.error(
    `[Lavalink:Engine] Track permanently stuck in Guild ${player.guildId}. Details:`,
    payload
  )

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  // Dynamic import to avoid circular dependencies if BotManager imports this file
  const { EmbedBuilder } = await import('discord.js')

  const embed = new EmbedBuilder()
    .setColor('Orange')
    .setTitle('⚠️ Bài hát bị kẹt (Stuck)')
    .setDescription(
      `Bài hát **${track?.info?.title ?? 'Unknown Track'}** đang bị kẹt. Hệ thống sẽ tự động chuyển bài.`
    )
    .setTimestamp()

  await (channel as import('discord.js').TextChannel).send({ embeds: [embed] }).catch(() => null)
}
