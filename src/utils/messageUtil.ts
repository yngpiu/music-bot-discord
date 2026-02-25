import { type Message } from 'discord.js'

import { TIME } from '~/constants/time.js'

import { logger } from '~/utils/logger.js'

export const deleteMessage = (
  messages: (Message | null | undefined)[],
  timeoutMs: number = TIME.SHORT
) => {
  if (!messages || messages.length === 0) return

  setTimeout(() => {
    messages.forEach((msg) => {
      if (msg) {
        msg.delete().catch((e: Error) => {
          logger.warn(`[Hệ Thống] Không thể xoá tin nhắn cũ: ${e.message}`)
        })
      }
    })
  }, timeoutMs)
}
