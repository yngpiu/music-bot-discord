/**
 * @file errors.ts
 * @description Custom error classes for the bot.
 */

/**
 * Generic bot error.
 */
export class BotError extends Error {
  /**
   * @param {string} message - The error message.
   */
  constructor(message: string) {
    super(message)
    this.name = 'BotError'
  }
}
