import { EmbedBuilder, Message } from 'discord.js'

import { RANDOM_LOADING_MESSAGES } from '~/constants/message.js'

export async function sendLoadingMessage(message: Message): Promise<Message> {
  const randomMessage =
    RANDOM_LOADING_MESSAGES[Math.floor(Math.random() * RANDOM_LOADING_MESSAGES.length)]

  return message.reply({
    embeds: [new EmbedBuilder().setColor(0x2b2d31).setDescription(`⏳ ${randomMessage}`)]
  })
}
