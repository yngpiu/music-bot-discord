// Custom Discord client extended with additional managers and command collections.
import {
  AutocompleteInteraction,
  ButtonInteraction,
  Client,
  Collection,
  GatewayIntentBits,
  ModalSubmitInteraction
} from 'discord.js'
import { LavalinkManager } from 'lavalink-client'

import type { BaseCommand } from '~/core/BaseCommand.js'
import type { BotManager } from '~/core/BotManager.js'

// Interface for specialized interaction handlers.
type InteractionHandler<T> = (interaction: T, bot: BotClient) => Promise<unknown>

// Extended Discord.js Client to include music and command management functionality.
export class BotClient extends Client {
  // The index of this bot instance in the configuration.
  public botIndex: number
  // Reference to the shared BotManager.
  public manager!: BotManager
  // Lavalink manager for handling audio players and node connections.
  public lavalink!: LavalinkManager
  // Collection of loaded commands.
  public commands: Collection<string, BaseCommand> = new Collection()
  // Map for custom button interactions.
  public buttonHandlers: Collection<string, InteractionHandler<ButtonInteraction>> =
    new Collection()
  // Map for custom modal submissions.
  public modalHandlers: Collection<string, InteractionHandler<ModalSubmitInteraction>> =
    new Collection()
  // Map for custom autocomplete fields.
  public autocompleteHandlers: Collection<string, InteractionHandler<AutocompleteInteraction>> =
    new Collection()

  // Initializes a new instance of the BotClient.
  constructor(botIndex: number) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
      ]
    })
    this.botIndex = botIndex
  }
}
