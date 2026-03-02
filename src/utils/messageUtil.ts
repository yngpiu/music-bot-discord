// Utilities for asynchronous message management and cleanup.
import {
  ActionRowBuilder,
  ButtonInteraction,
  Channel,
  ChatInputCommandInteraction,
  ContainerBuilder,
  DiscordAPIError,
  EmbedBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  type Message,
  type MessageActionRowComponentBuilder,
  type MessageCreateOptions,
  type MessageEditOptions,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'

import { EMOJI } from '~/constants/emoji'
import { TIME } from '~/constants/time.js'

import { logger } from '~/utils/logger.js'

export async function safeReply(
  target: Message | RepliableInteraction,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options: any
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (target as any).reply(options).catch((err: Error) => {
    logger.warn('[MessageUtil] Error in safeReply:', err.message)
    return null
  })
}

export async function safeSend(
  channel: import('discord.js').TextBasedChannel,
  options: string | import('discord.js').MessageCreateOptions | import('discord.js').MessagePayload
) {
  if (!('send' in channel)) return null
  return channel.send(options).catch((err: Error) => {
    logger.warn('[MessageUtil] Error in safeSend:', err.message)
    return null
  })
}

export async function safeEditReply(
  interaction: RepliableInteraction,
  options:
    | string
    | import('discord.js').MessagePayload
    | import('discord.js').InteractionEditReplyOptions
) {
  return interaction.editReply(options).catch((err) => {
    logger.warn('[MessageUtil] Error in safeEditReply:', err.message)
    return null
  })
}

export async function safeReact(message: Message, emoji: string) {
  return message.react(emoji).catch(() => null)
}

// Immediately deletes multiple messages and waits for the operation to complete.
export const deleteMessageNow = async (messages: (Message | null | undefined)[]): Promise<void> => {
  if (!messages || messages.length === 0) return

  for (const msg of messages) {
    if (msg && msg.deletable) {
      await msg.delete().catch(() => {})
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
          msg.delete().catch(() => {})
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

  const sendedMessage = await safeSend(channel, {
    components: [container],
    flags: ['IsComponentsV2', 'SuppressNotifications']
  })

  if (!sendedMessage) return

  deleteMessage([sendedMessage], timeoutDeleteMessage)

  return sendedMessage
}

export async function replySuccessMessage(message: Message, content: string) {
  const container = createContainerMessage(`${EMOJI.SUCCESS} ${content}`)

  const repliedMessage = await safeReply(message, {
    components: [container],
    flags: ['IsComponentsV2', 'SuppressNotifications']
  })

  await message.reactions.removeAll().catch(() => {})

  if (!repliedMessage) return

  deleteMessage([repliedMessage, message], TIME.VERY_SHORT)

  return repliedMessage
}

export async function replySuccessEmbed(
  message: Message,
  embed: EmbedBuilder,
  components?: ActionRowBuilder<MessageActionRowComponentBuilder>[],
  timeout?: number
) {
  const repliedMessage = await safeReply(message, {
    embeds: [embed],
    components,
    flags: ['SuppressNotifications']
  })

  await message.reactions.removeAll().catch(() => {})

  if (!repliedMessage) return

  if (timeout && timeout > 0) {
    deleteMessage([repliedMessage, message], timeout)
  } else {
    deleteMessage([repliedMessage, message], TIME.VERY_SHORT)
  }

  return repliedMessage
}

export async function sendFollowUpEphemeral(interaction: RepliableInteraction, content: string) {
  return interaction.followUp({
    content,
    ephemeral: true
  })
}

export type RepliableInteraction =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction

// ─── Internal Helpers ─────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

async function safeRemoveAllReactions(message: Message): Promise<void> {
  if (!message.reactions.cache.size) return
  try {
    await message.reactions.removeAll()
  } catch {
    // Thiếu MANAGE_MESSAGES permission hoặc message đã bị xóa
  }
}

function scheduleDelete(messages: Message[], timeout?: number): void {
  if (!timeout || timeout <= 0) return
  safeDeleteMessageAfter(messages, timeout)
}

// ─── Message ──────────────────────────────────────────────────────────────────

export async function safeSendMessageToChannel(
  channel: Channel | null | undefined,
  messageOptions: MessageCreateOptions,
  timeoutDeleteMessage?: number
): Promise<Message | null> {
  if (!channel?.isTextBased() || !channel.isSendable()) return null

  try {
    const sentMessage = await channel.send(messageOptions)
    scheduleDelete([sentMessage], timeoutDeleteMessage)
    return sentMessage
  } catch {
    return null
  }
}

export async function safeReplyMessage(
  message: Message | null | undefined,
  messageOptions: MessageCreateOptions,
  timeoutDeleteMessage?: number
): Promise<Message | null> {
  if (!message?.channel.isTextBased() || !message.channel.isSendable()) return null

  try {
    const repliedMessage = await message.reply(messageOptions)
    await safeRemoveAllReactions(message)
    scheduleDelete([repliedMessage, message], timeoutDeleteMessage)
    return repliedMessage
  } catch {
    return null
  }
}

export async function safeEditMessage(
  message: Message | null | undefined,
  messageOptions: MessageEditOptions,
  timeoutDeleteMessage?: number
): Promise<Message | null> {
  if (!message?.editable) return null

  try {
    const editedMessage = await message.edit(messageOptions)
    await safeRemoveAllReactions(message)
    scheduleDelete([editedMessage], timeoutDeleteMessage)
    return editedMessage
  } catch {
    return null
  }
}

// Quickly adds a loading reaction to a message.
export async function reactLoadingMessage(message: Message | null | undefined): Promise<void> {
  if (!message) return
  try {
    const existing = message.reactions.cache.get(EMOJI.LOADING.match(/:(\d+)>/)?.[1] ?? '')
    if (!existing || !existing.me) {
      await message.react(EMOJI.LOADING)
    }
  } catch {
    // Ignore error
  }
}

export async function safeDeleteMessageNow(
  messages: (Message | null | undefined) | (Message | null | undefined)[]
): Promise<boolean> {
  const msgArray = Array.isArray(messages) ? messages : [messages]
  const valid = msgArray.filter((m): m is Message => m != null && m.deletable)
  if (valid.length === 0) return false

  await Promise.allSettled(valid.map((m) => safeRemoveAllReactions(m)))

  const results = await Promise.allSettled(valid.map((m) => m.delete()))
  return results.some((r) => r.status === 'fulfilled')
}

export async function safeDeleteMessageAfter(
  messages: (Message | null | undefined) | (Message | null | undefined)[],
  timeoutDeleteMessage: number
): Promise<boolean> {
  const msgArray = Array.isArray(messages) ? messages : [messages]
  const valid = msgArray.filter((m): m is Message => m != null && m.deletable)
  if (valid.length === 0) return false

  await delay(timeoutDeleteMessage)
  return safeDeleteMessageNow(valid)
}

// ─── Interaction ──────────────────────────────────────────────────────────────

export async function safeReplyInteraction(
  interaction: RepliableInteraction | null | undefined,
  options: InteractionReplyOptions,
  timeoutDeleteMessage?: number
): Promise<InteractionResponse | null> {
  if (!interaction || interaction.replied || interaction.deferred) return null

  try {
    const response = await interaction.reply(options)

    const fetched = await interaction.fetchReply().catch(() => null)
    if (fetched) {
      scheduleDelete([fetched], timeoutDeleteMessage)
    }

    return response
  } catch {
    return null
  }
}

export async function safeEditReplyInteraction(
  interaction: RepliableInteraction | null | undefined,
  options: InteractionEditReplyOptions,
  timeoutDeleteMessage?: number
): Promise<Message | null> {
  if (!interaction || (!interaction.replied && !interaction.deferred)) return null

  try {
    const edited = await interaction.editReply(options)
    await safeRemoveAllReactions(edited)
    return edited
  } catch {
    return null
  }
}

export async function safeFollowUpInteraction(
  interaction: RepliableInteraction | null | undefined,
  options: InteractionReplyOptions,
  timeoutDeleteMessage?: number
): Promise<Message | null> {
  if (!interaction || (!interaction.replied && !interaction.deferred)) return null

  try {
    const followed = await interaction.followUp(options)
    scheduleDelete([followed], timeoutDeleteMessage)
    return followed
  } catch {
    return null
  }
}

export async function safeDeferReplyInteraction(
  interaction: RepliableInteraction | null | undefined,
  options?: { ephemeral?: boolean }
): Promise<InteractionResponse | null> {
  if (!interaction || interaction.replied || interaction.deferred) return null

  try {
    return await interaction.deferReply({ ephemeral: options?.ephemeral ?? false })
  } catch {
    return null
  }
}

export async function safeReplyMessageWithContainer(
  message: Message,
  container: ContainerBuilder,
  timeoutDeleteMessage?: number
) {
  const repliedMessage = await safeReplyMessage(
    message,
    {
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    },
    timeoutDeleteMessage
  )

  return repliedMessage
}

export async function safeReplySuccessMessage(
  message: Message,
  content: string,
  timeoutDeleteMessage: number = TIME.VERY_SHORT
) {
  const repliedMessage = await safeReplyMessageWithContainer(
    message,
    new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(`${EMOJI.SUCCESS} ${content}`)
    ),
    timeoutDeleteMessage
  )

  return repliedMessage
}

export async function safeReplyErrorMessage(
  message: Message,
  content: string,
  timeoutDeleteMessage: number = TIME.VERY_SHORT
) {
  const repliedMessage = await safeReplyMessageWithContainer(
    message,
    new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(`${EMOJI.ERROR} ${content}`)
    ),
    timeoutDeleteMessage
  )

  return repliedMessage
}

export async function safeSendMessageWithContainer(
  channel: Channel | null | undefined,
  containerOrText: ContainerBuilder | string,
  timeoutDeleteMessage?: number
) {
  if (!channel) return null

  const container =
    typeof containerOrText === 'string'
      ? new ContainerBuilder().addTextDisplayComponents((t) => t.setContent(containerOrText))
      : containerOrText

  const sended = await safeSendMessageToChannel(
    channel,
    {
      components: [container],
      flags: ['IsComponentsV2', 'SuppressNotifications']
    },
    timeoutDeleteMessage
  )

  return sended
}
