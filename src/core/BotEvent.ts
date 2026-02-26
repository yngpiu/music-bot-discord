/**
 * @file BotEvent.ts
 * @description Base class for defining Discord client events.
 */
import type { BotClient } from '~/core/BotClient.js'
import type { BotManager } from '~/core/BotManager.js'

/**
 * Abstract class representing a Discord event.
 */
export abstract class BotEvent {
  /** The name of the event (e.g., 'messageCreate', 'ready'). */
  abstract name: string
  /** Whether the event should only be triggered once. */
  once?: boolean

  /**
   * Defines the logic to run when the event is triggered.
   * @param {BotClient} bot - The bot client instance.
   * @param {BotManager} manager - The global bot manager.
   * @param {...any[]} args - Variable arguments provided by the event trigger.
   */
  abstract execute(bot: BotClient, manager: BotManager, ...args: any[]): Promise<void>
}
