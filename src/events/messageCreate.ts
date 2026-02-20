import { Events, Message } from 'discord.js'
import { config } from '~/config/env.js'

import type { BotClient } from '~/core/BotClient'
import type { BotManager } from '~/core/BotManager'
import { asyncMessageHandler } from '~/lib/asyncHandlers.js'

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

    const member = message.guild.members.cache.get(message.author.id)
    const vcId = member?.voice?.channelId ?? undefined

    const chosenBot = manager.getOrAssignBot(message.guild.id, {
      vcId,
      messageId: message.id,
      requiresVoice: command.requiresVoice ?? false
    })

    if (!chosenBot) {
      // All bots busy — only first bot replies to avoid duplicates
      if (bot.botIndex === 0) {
        await message.reply('❌ All bots are currently busy! Please try again later.')
      }
      return
    }

    if (chosenBot.user?.id !== bot.user?.id) return

    await asyncMessageHandler(command.execute)(bot, message, args)
  }
}
