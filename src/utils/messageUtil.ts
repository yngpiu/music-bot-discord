// Utilities for asynchronous message management and cleanup.
import { Channel, ContainerBuilder, type Message } from 'discord.js'

import { TIME } from '~/constants/time.js'

// Immediately deletes multiple messages and waits for the operation to complete.
export const deleteMessageNow = async (messages: (Message | null | undefined)[]): Promise<void> => {
  if (!messages || messages.length === 0) return

  for (const msg of messages) {
    if (msg && msg.deletable) {
      await msg.delete().catch()
    }
  }
}

// Schedules the deletion of multiple messages after a specified timeout without blocking.
export const deleteMessage = (
  messages: (Message | null | undefined)[],
  timeoutMs: number = TIME.SHORT
): void => {
  if (!messages || messages.length === 0) return

  setTimeout(
    () => {
      messages.forEach((msg) => {
        if (msg && msg.deletable) {
          msg.delete().catch()
        }
      })
    },
    Math.max(0, timeoutMs)
  )
}

export function createContainerMessage(message: string) {
  return new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(`${message}`))
}

export async function sendContainerMessage(
  channel: Channel | null | undefined,
  content: string,
  timeoutDeleteMessage: number = TIME.SHORT
) {
  const container = createContainerMessage(content)

  if (!channel || !channel.isTextBased() || !('send' in channel)) return

  const sendedMessage = await channel.send({
    components: [container],
    flags: ['IsComponentsV2', 'SuppressNotifications']
  })

  if (!sendedMessage) return

  deleteMessage([sendedMessage], timeoutDeleteMessage)

  return sendedMessage
}
