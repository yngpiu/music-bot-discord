import type { Message } from 'discord.js'

import type { BotClient } from '~/core/BotClient.js'

export abstract class BaseCommand {
  abstract name: string
  aliases?: string[]
  description?: string

  /** Player must exist in this guild. */
  requiresVoice?: boolean
  /** User must be in the same voice channel as the bot (implies requiresVoice). */
  requiresVoiceMatch?: boolean
  /** User must be the player owner (implies requiresVoice). */
  requiresOwner?: boolean

  abstract execute(
    bot: BotClient,
    message: Message,
    args: string[],
    ctx: CommandContext
  ): Promise<void>
}
