// Command to invite the bot to the user's current voice channel.
import { type Message, type VoiceChannel } from 'discord.js'
import type { Player } from 'lavalink-client'

import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { reactLoadingMessage, replySuccessMessage } from '~/utils/messageUtil.js'
import { getBotName } from '~/utils/stringUtil.js'

// Command to summon the bot to a voice channel.
class JoinCommand extends BaseCommand {
  name = 'join'
  aliases = ['j']
  description = 'Gọi bot vào kênh thoại hiện tại.'

  // Validates if the bot can actually join the requested voice channel.
  private validateVoiceChannel(bot: BotClient, message: Message, vcId: string): void {
    const vc = message.guild!.channels.cache.get(vcId) as VoiceChannel
    if (!vc?.joinable) throw new BotError(`${getBotName(bot)} không thể vào kênh thoại của bạn.`)
  }

  // Checks if a player already exists and if it's already in the target channel or busy elsewhere.
  private checkExistingPlayer(
    bot: BotClient,
    message: Message,
    vcId: string,
    existingPlayer: Player | null
  ): void {
    if (!existingPlayer) return

    if (existingPlayer.voiceChannelId === vcId) {
      throw new BotError(`${getBotName(bot)} đang ở trong kênh thoại này rồi mà.`)
    }

    throw new BotError(`${getBotName(bot)} đang bận phục vụ ở kênh thoại khác mất rồi.`)
  }

  // Retrieves an existing player or creates a new one for the guild.
  private async getOrCreatePlayer(
    bot: BotClient,
    message: Message,
    vcId: string,
    existingPlayer: Player | null
  ): Promise<Player> {
    const player =
      existingPlayer ??
      bot.lavalink.createPlayer({
        guildId: message.guild!.id,
        voiceChannelId: vcId,
        textChannelId: message.channel.id,
        selfDeaf: true,
        selfMute: false,
        volume: 100,
        instaUpdateFiltersFix: true
      })

    if (!player.connected) await player.connect()

    // Assign owner if not already set.
    if (!player.get('owner')) player.set('owner', message.author.id)
    return player
  }

  // Executes the join command.
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { vcId, player: existingPlayer }: CommandContext
  ): Promise<void> {
    if (!message.guild) return
    await reactLoadingMessage(message)
    logger.info(`[Command: join] User ${message.author.tag} requested bot to join channel`)

    if (!vcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')

    this.validateVoiceChannel(bot, message, vcId)

    this.checkExistingPlayer(bot, message, vcId, existingPlayer)

    await this.getOrCreatePlayer(bot, message, vcId, existingPlayer)
    await replySuccessMessage(message, `${getBotName(bot)} đã sẵn sàng phát nhạc ở kênh này.`)
  }
}

export default new JoinCommand()
