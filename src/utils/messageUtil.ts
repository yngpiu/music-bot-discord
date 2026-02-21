import { Message } from 'discord.js'

import { EMOJI } from '~/constants/emoji.js'

export async function sendLoadingMessage(message: Message): Promise<Message> {
  return message.reply(EMOJI.ANIMATED_LOADING)
}
