// Custom error classes for the bot.

// Generic bot error.
export class BotError extends Error {
  
  constructor(message: string) {
    super(message)
    this.name = 'BotError'
  }
}
