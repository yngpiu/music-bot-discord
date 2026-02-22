import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, selfDeaf: boolean, serverDeaf: boolean) => {
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Deaf status changed. ${JSON.stringify({ selfDeaf, serverDeaf })}`
  )

  if (player.get('ignore_voice_state')) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      `${EMOJI.ANIMATED_IDK} Bot đã bị ${serverDeaf ? '**Server Deafen (Bịt Tai)**' : '**bỏ Server Deafen**'}`
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    })
    .catch(() => null)
}
