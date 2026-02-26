/**
 * @file messageUtil.ts
 * @description Utilities for asynchronous message management and cleanup.
 */
import { type Message } from 'discord.js'

import { TIME } from '~/constants/time.js'

import { logger } from '~/utils/logger.js'

/**
 * Schedules the deletion of multiple messages after a specified timeout.
 * @param {(Message | null | undefined)[]} messages - The list of messages to delete.
 * @param {number} [timeoutMs=TIME.SHORT] - How long to wait before deletion (in milliseconds).
 */
export const deleteMessage = (
  messages: (Message | null | undefined)[],
  timeoutMs: number = TIME.SHORT
) => {
  if (!messages || messages.length === 0) return

  setTimeout(() => {
    messages.forEach((msg) => {
      if (msg) {
        msg.delete().catch((e: Error) => {
          logger.warn(`[System] Failed to delete old messages: ${e.message}`)
        })
      }
    })
  }, timeoutMs)
}
