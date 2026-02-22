import { ContainerBuilder } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player, selfMuted: boolean, serverMuted: boolean) => {
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Mute status changed. ${JSON.stringify({ selfMuted, serverMuted })}`
  )

  if (serverMuted) {
    player.set('paused_of_servermute', true)
    if (!player.paused) await player.pause()
  } else {
    if (player.get('paused_of_servermute')) {
      if (player.paused) await player.resume()
      player.set('paused_of_servermute', false)
    }
  }

  if (player.get('ignore_voice_state')) return

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const container = new ContainerBuilder().addTextDisplayComponents((t) =>
    t.setContent(
      `${EMOJI.ANIMATED_IDK} Bot đã bị ${serverMuted ? '**Server Mute** nên nhạc sẽ tạm dừng' : '**bỏ Server Mute**, tiếp tục phát nhạc'}`
    )
  )

  await channel
    .send({
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    })
    .catch(() => null)
}
