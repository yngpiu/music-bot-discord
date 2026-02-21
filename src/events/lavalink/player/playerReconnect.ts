import { logger } from '~/utils/logger.js'
import { EmbedBuilder, TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { BotClient } from '~/core/BotClient.js'



export default async (bot: BotClient, player: Player, voiceChannelId: string) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: Successfully reconnected to voice channel <#${voiceChannelId}>.`)

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const embed = new EmbedBuilder()
    .setColor('Green')
    .setTitle('🔄 Đã kết nối lại')
    .setDescription(`Đã kết nối lại thành công vào kênh <#${voiceChannelId}>`)
    .setTimestamp()

  await (channel as TextChannel).send({ embeds: [embed] }).catch(() => null)
}
