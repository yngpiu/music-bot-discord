import { Events, Interaction } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'
import type { BotManager } from '~/core/BotManager'

class InteractionCreateEvent extends BotEvent {
  name = Events.InteractionCreate

  async execute(bot: BotClient, _manager: BotManager, interaction: Interaction) {
    if (interaction.isButton()) {
      const handler = bot.buttonHandlers.get(interaction.customId)
      if (handler) await handler(interaction, bot)
      return
    }

    if (interaction.isModalSubmit()) {
      const handler = bot.modalHandlers.get(interaction.customId)
      if (handler) await handler(interaction, bot)
      return
    }

    if (interaction.isAutocomplete()) {
      const handler = bot.autocompleteHandlers.get(interaction.commandName)
      if (handler) await handler(interaction, bot)
      return
    }
  }
}

export default new InteractionCreateEvent()
