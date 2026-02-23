import { ContainerBuilder, Events, Message } from 'discord.js'
import { config } from '~/config/env.js'

import { EMOJI } from '~/constants/emoji'
import type { BotClient } from '~/core/BotClient'
import type { BotManager } from '~/core/BotManager'

import { getDeterministicIndexFromId } from '~/utils/numberUtil.js'
import { checkRateLimit } from '~/utils/rateLimiter.js'
import { lines } from '~/utils/stringUtil'

export default {
  name: Events.MessageCreate,
  async execute(bot: BotClient, manager: BotManager, message: Message) {
    if (message.author.bot || !message.guild) return
    if (!message.content.startsWith(config.prefix)) return

    const args = message.content.slice(config.prefix.length).trim().split(/\s+/)
    const commandName = args.shift()?.toLowerCase()
    if (!commandName) return

    const command = bot.commands.get(commandName)
    if (!command) return

    // ─── Rate Limit ───────────────────────────────────────────────────────────
    const isOwner = config.ownerId && message.author.id === config.ownerId
    if (!isOwner) {
      const { limited, remainingMs } = checkRateLimit(message.author.id)
      if (limited) {
        const remaining = (remainingMs / 1000).toFixed(1)
        const container = new ContainerBuilder().addTextDisplayComponents((t) =>
          t.setContent(
            `${EMOJI.ERROR} Bạn đang dùng lệnh quá nhanh! Vui lòng chờ **${remaining}s** trước khi thử lại.`
          )
        )
        const reply = await message
          .reply({ components: [container], flags: ['IsComponentsV2'] })
          .catch(() => null)
        if (reply) {
          setTimeout(() => {
            reply.delete().catch(() => {})
            message.delete().catch(() => {})
          }, 5000)
        }
        return
      }
    }

    const member = message.guild.members.cache.get(message.author.id)
    const vcId = member?.voice?.channelId ?? undefined

    const chosenBot = manager.getOrAssignBot(message.guild.id, {
      vcId,
      messageId: message.id,
      requiresVoice: command.requiresVoice ?? false
    })

    if (!chosenBot) {
      const container = new ContainerBuilder().addTextDisplayComponents((t) =>
        t.setContent(
          lines(`${EMOJI.ANIMATED_CAT_CRYING} Chúng tớ đang bận hết rồi, bạn thử lại sau nhé.`)
        )
      )
      // All bots busy — pick one predictably based on message ID to avoid duplicates
      const randomBotIndex = getDeterministicIndexFromId(message.id, manager.bots.length)
      if (bot.botIndex === randomBotIndex) {
        await message.reply({ components: [container], flags: ['IsComponentsV2'] })
      }
      return
    }

    if (chosenBot.user?.id !== bot.user?.id) return

    await command.execute(bot, message, args)
  }
}
