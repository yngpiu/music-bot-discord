// Base class for defining Discord client events.
import type { BotClient } from '~/core/BotClient.js'
import type { BotManager } from '~/core/BotManager.js'

// Abstract class representing a Discord event.
export abstract class BotEvent {
  // The name of the event (e.g., 'messageCreate', 'ready').
  abstract name: string
  // Whether the event should only be triggered once.
  once?: boolean

  // Defines the logic to run when the event is triggered.
  abstract execute(bot: BotClient, manager: BotManager, ...args: unknown[]): Promise<void>
}
