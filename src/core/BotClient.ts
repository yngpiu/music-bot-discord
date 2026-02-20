import { Client, Collection, GatewayIntentBits } from 'discord.js'
import { LavalinkManager } from 'lavalink-client'

export class BotClient extends Client {
  public botIndex: number
  public lavalink!: LavalinkManager
  public commands: Collection<string, Command> = new Collection()

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
