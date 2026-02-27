// Defines the base structure for all commands in the bot.
import type { Message } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'

// Abstract class representing a command. All bot commands should extend this class.
export abstract class BaseCommand {
  // The name of the command.
  abstract name: string
  // Alternative names for the command.
  aliases?: string[]
  // A brief description of what the command does.
  description?: string

  // If true, a Lavalink player must exist in the guild to use this command.
  requiresVoice?: boolean
  // If true, the user must be in the same voice channel as the bot.
  requiresVoiceMatch?: boolean
  // If true, the user must be the person who started the current player.
  requiresOwner?: boolean

  // Executes the command logic.
  abstract execute(
    bot: BotClient,
    message: Message,
    args: string[],
    ctx: CommandContext
  ): Promise<void>
}
