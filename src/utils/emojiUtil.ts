/**
 * @file emojiUtil.ts
 * @description Utilities for mapping service links to their corresponding brand emojis.
 */
import { EMOJI } from '../constants/emoji'

/**
 * Returns a brand emoji based on the provided URL identifier.
 * @param {string} [uri] - The link to analyze.
 * @returns {string} - The corresponding emoji or a default music icon.
 */
export function getEmojiFromLink(uri?: string): string {
  if (uri) {
    if (uri.includes('spotify')) return EMOJI.SPOTIFY
    if (uri.includes('deezer')) return EMOJI.DEEZER
    if (uri.includes('youtube') || uri.includes('youtu.be')) return EMOJI.YOUTUBE
    if (uri.includes('music.youtube')) return EMOJI.YOUTUBE_MUSIC
    if (uri.includes('soundcloud')) return EMOJI.SOUNDCLOUD
    if (uri.includes('music.apple')) return EMOJI.APPLE_MUSIC
  }

  return '🎵'
}
