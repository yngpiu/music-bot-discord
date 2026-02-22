import { ContainerBuilder, TextChannel } from 'discord.js'
import { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji'
import { BotClient } from '~/core/BotClient.js'

import { logger } from '~/utils/logger.js'

export default async (bot: BotClient, player: Player) => {
  logger.info(
    `[Lavalink:Player] ${player.guildId} :: Disconnect timer ended. Player leaving channel.`
  )

  const channel = bot.channels.cache.get(player.textChannelId!)
  if (!channel?.isTextBased() || !('send' in channel)) return

  const msgId = player.get('queueEmptyMessageId')

  if (msgId) {
    try {
      const msg = await (channel as TextChannel).messages.fetch(msgId as string)
      if (msg?.deletable) {
        await msg.delete()
      }
      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(`${EMOJI.ANIMATED_CAT_BYE} Không thấy ai làm gì cả, tớ đi ngủ đây.`)
      )
      await channel.send({
        components: [container],
        flags: ['IsComponentsV2']
      })
    } catch (error) {
      logger.error(`Failed to delete queue empty message on end: ${error}`)
    }
  }
}
