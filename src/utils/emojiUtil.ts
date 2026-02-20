import { EMOJI } from '../constants/emoji'

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
