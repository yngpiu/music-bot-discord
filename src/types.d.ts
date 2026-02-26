import type { Message } from 'discord.js'
import type { Player } from 'lavalink-client'
import type { BotClient } from '~/BotClient'

declare global {
  /**
   * Pre-validated context populated by the command middleware in messageCreate.
   * Only meaningful when the corresponding `requires*` flag is set on the command.
   */
  interface CommandContext {
    /** Active player for this guild — guaranteed non-null when `requiresVoice` is true. */
    player: Player
    /** Voice channel ID of the user who triggered the command. */
    vcId: string
  }

  interface Command {
    name: string
    aliases?: string[]
    description?: string
    /** Player must exist in this guild. */
    requiresVoice?: boolean
    /** User must be in the same voice channel as the bot (implies requiresVoice). */
    requiresVoiceMatch?: boolean
    /** User must be the player owner (implies requiresVoice). */
    requiresOwner?: boolean
    execute(bot: BotClient, message: Message, args: string[], ctx: CommandContext): Promise<void>
  }
}

export {}
