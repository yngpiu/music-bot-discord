import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, suppress: boolean) => {
  logger.info(`[Lavalink:Player] ${player.guildId} :: Suppress status changed.`, { suppress })

  if (player.get('ignore_voice_state')) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      `${EMOJI.ANIMATED_IDK} Bot đã bị ${suppress ? '**Chuyển thành Khán giả** (bị tắt mic) trên Stage' : '**Chuyển thành Diễn giả** (được cấp mic) trên Stage'}`
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    })
    .catch(() => null)
}
