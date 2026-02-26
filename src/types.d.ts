/**
 * @file types.d.ts
 * @description Global type definitions and augmentations for the project.
 */
import type { Player } from 'lavalink-client'

declare global {
  /**
   * Represents the context available to command execution.
   */
  interface CommandContext {
    /** Active player for this guild — guaranteed non-null when `requiresVoice` is true. */
    player: Player
    /** Voice channel ID of the user who triggered the command. */
    vcId: string
  }
}

export {}
