// Base class for defining Lavalink-specific events.
import type { BotClient } from '~/core/BotClient.js'

// Abstract class representing a Lavalink manager event.
export abstract class LavalinkEvent {
  // The name of the Lavalink event.
  abstract name: string

  // Defines the logic to run when the Lavalink event is triggered.
  abstract execute(bot: BotClient, ...args: unknown[]): Promise<void>
}
