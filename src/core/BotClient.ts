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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InteractionHandler<T> = (interaction: T, bot: any) => Promise<unknown>

export class BotClient extends Client {
  public botIndex: number
  public manager!: BotManager
  public lavalink!: LavalinkManager
  public commands: Collection<string, BaseCommand> = new Collection()
  public buttonHandlers: Collection<string, InteractionHandler<ButtonInteraction>> =
    new Collection()
  public modalHandlers: Collection<string, InteractionHandler<ModalSubmitInteraction>> =
    new Collection()
  public autocompleteHandlers: Collection<string, InteractionHandler<AutocompleteInteraction>> =
    new Collection()

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
