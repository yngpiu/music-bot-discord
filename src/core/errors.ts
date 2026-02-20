/**
 * Lỗi user-facing — throw trong commands, reply message cho user.
 * Không crash app, không log console.
 */
export class BotError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BotError'
  }
}
