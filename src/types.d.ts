import type { Message } from 'discord.js'
import type { BotClient } from '~/BotClient'

declare global {
  interface Command {
    name: string
    aliases?: string[]
    description?: string
    requiresVoice?: boolean
    execute(bot: BotClient, message: Message, args: string[]): Promise<void>
  }
}

export {}
