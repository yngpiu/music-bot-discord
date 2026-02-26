/**
 * @file join.ts
 * @description Command to invite the bot to the user's current voice channel.
 */
import { ContainerBuilder, type Message, type VoiceChannel } from 'discord.js'
import type { Player } from 'lavalink-client'

import { EMOJI } from '~/constants/emoji.js'
import { TIME } from '~/constants/time.js'
import { BaseCommand } from '~/core/BaseCommand.js'
import type { BotClient } from '~/core/BotClient.js'
import { BotError } from '~/core/errors.js'

import { logger } from '~/utils/logger.js'
import { deleteMessage } from '~/utils/messageUtil.js'

/**
 * Command to summon the bot to a voice channel.
 */
class JoinCommand extends BaseCommand {
  name = 'join'
  aliases = ['j']
  description = 'Gọi bot vào kênh thoại hiện tại.'

  /**
   * Validates if the bot can actually join the requested voice channel.
   * @param {Message} message - The command message.
   * @param {string} vcId - The ID of the voice channel.
   * @throws {BotError} - If the channel is not joinable.
   */
  private validateVoiceChannel(message: Message, vcId: string): void {
    const vc = message.guild!.channels.cache.get(vcId) as VoiceChannel
    if (!vc?.joinable) throw new BotError('Tớ không thể vào kênh thoại của bạn.')
  }

  /**
   * Checks if a player already exists and if it's already in the target channel or busy elsewhere.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string} vcId - The target voice channel ID.
   * @param {Player | null} existingPlayer - The current player instance, if any.
   * @throws {BotError} - If the bot is already in the channel or busy in another channel.
   */
  private checkExistingPlayer(
    bot: BotClient,
    message: Message,
    vcId: string,
    existingPlayer: Player | null
  ): void {
    if (!existingPlayer) return

    if (existingPlayer.voiceChannelId === vcId) {
      throw new BotError('Tớ đang ở trong kênh thoại này rồi mà.')
    }

    const isTargeted = message.mentions.users.has(bot.user!.id)
    throw new BotError(
      isTargeted
        ? 'Tớ đang bận phục vụ ở kênh khác rồi.'
        : 'Tớ đang bận phục vụ ở kênh thoại khác mất rồi.'
    )
  }

  /**
   * Retrieves an existing player or creates a new one for the guild.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string} vcId - The voice channel ID to join.
   * @param {Player | null} existingPlayer - The existing player instance, if any.
   * @returns {Promise<Player>} - The active player instance.
   */
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

  /**
   * Sends a confirmation message to the text channel.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   */
  private async sendJoinConfirmation(bot: BotClient, message: Message): Promise<void> {
    if (!message.channel.isTextBased() || !('send' in message.channel)) return

    const container = new ContainerBuilder().addTextDisplayComponents((t) =>
      t.setContent(
        `${EMOJI.ANIMATED_CAT_LOVE_YOU} **${bot.user?.displayName || 'tớ'}** đã sẵn sàng phát nhạc ở kênh này.`
      )
    )

    const replyMessage = await message.channel
      .send({ components: [container], flags: ['IsComponentsV2'] })
      .catch((e) => {
        logger.warn('[Command: join] Error sending notification:', e)
        return null
      })

    if (replyMessage) deleteMessage([message], TIME.SHORT)
  }

  /**
   * Executes the join command.
   * @param {BotClient} bot - The Discord client instance.
   * @param {Message} message - The command message.
   * @param {string[]} _args - Command arguments (unused).
   * @param {CommandContext} context - The command execution context.
   */
  async execute(
    bot: BotClient,
    message: Message,
    _args: string[],
    { vcId, player: existingPlayer }: CommandContext
  ): Promise<void> {
    if (!message.guild) return
    logger.info(`[Command: join] User ${message.author.tag} requested bot to join channel`)

    if (!vcId) throw new BotError('Bạn đang không ở kênh thoại nào cả.')
    this.validateVoiceChannel(message, vcId)

    this.checkExistingPlayer(bot, message, vcId, existingPlayer)

    await this.getOrCreatePlayer(bot, message, vcId, existingPlayer)
    await this.sendJoinConfirmation(bot, message)
  }
}

export default new JoinCommand()
