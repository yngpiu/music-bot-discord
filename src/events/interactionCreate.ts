// Listens for Discord interactions (buttons, modals, autocompletes) and routes them to their respective handlers.
import { Events, Interaction } from 'discord.js'

import type { BotClient } from '~/core/BotClient'
import { BotEvent } from '~/core/BotEvent.js'
import type { BotManager } from '~/core/BotManager'

// Event handler for when an interaction is created.
class InteractionCreateEvent extends BotEvent {
  name = Events.InteractionCreate

  // Executes the interaction handling logic.
  async execute(bot: BotClient, _manager: BotManager, interaction: Interaction): Promise<void> {
    // Route button interactions.
    if (interaction.isButton()) {
      const handler = bot.buttonHandlers.get(interaction.customId)
      if (handler) await handler(interaction, bot)
      return
    }

    // Route modal submissions.
    if (interaction.isModalSubmit()) {
      const handler = bot.modalHandlers.get(interaction.customId)
      if (handler) await handler(interaction, bot)
      return
    }

    // Route autocomplete requests.
    if (interaction.isAutocomplete()) {
      const handler = bot.autocompleteHandlers.get(interaction.commandName)
      if (handler) await handler(interaction, bot)
      return
    }
  }
}

export default new InteractionCreateEvent()
