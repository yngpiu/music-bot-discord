// Utilities for asynchronous message management and cleanup.
import {
  ButtonInteraction,
  Channel,
  ChatInputCommandInteraction,
  ContainerBuilder,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  type Message,
  type MessageCreateOptions,
  type MessageEditOptions,
  ModalSubmitInteraction,
  StringSelectMenuInteraction
} from 'discord.js'

import { EMOJI } from '~/constants/emoji'
import { TIME } from '~/constants/time.js'

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
    scheduleDelete([editedMessage], timeoutDeleteMessage)
    return editedMessage
  } catch {
    return null
  }
}

// Quickly sends a typing indicator to a message's channel instead of a loading reaction.
export async function sendTypingMessage(message: Message | null | undefined): Promise<void> {
  if (!message || !message.channel) return
  try {
    if (message.channel.isTextBased() && message.channel.isSendable()) {
      await message.channel.sendTyping()
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
  options: InteractionEditReplyOptions
): Promise<Message | null> {
  if (!interaction || (!interaction.replied && !interaction.deferred)) return null

  try {
    const edited = await interaction.editReply(options)
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
