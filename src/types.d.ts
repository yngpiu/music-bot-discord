import type { Player } from 'lavalink-client'

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
}

export {}
