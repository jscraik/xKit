/**
 * Media attachment handler
 */

import type { TweetMedia } from '../lib/twitter-client-types.js';
import type { MediaAttachment, MediaConfig } from './types.js';

export class MediaHandler {
  private config: MediaConfig;

  constructor(config: Partial<MediaConfig> = {}) {
    this.config = {
      includeMedia: config.includeMedia ?? false,
      downloadMedia: config.downloadMedia ?? false,
      mediaDir: config.mediaDir ?? './media',
    };
  }

  /**
   * Extract media from tweet
   */
  extractMedia(tweetMedia?: TweetMedia[]): MediaAttachment[] {
    if (!this.config.includeMedia || !tweetMedia || tweetMedia.length === 0) {
      return [];
    }

    return tweetMedia.map((media) => this.convertMedia(media));
  }

  /**
   * Convert TweetMedia to MediaAttachment
   */
  private convertMedia(media: TweetMedia): MediaAttachment {
    const attachment: MediaAttachment = {
      type: media.type,
      url: media.url,
      thumbnailUrl: media.previewUrl,
      width: media.width,
      height: media.height,
    };

    // Add video-specific fields
    if (media.type === 'video' || media.type === 'animated_gif') {
      attachment.duration = media.durationMs ? media.durationMs / 1000 : undefined;
    }

    return attachment;
  }

  /**
   * Format media for markdown
   */
  formatMediaMarkdown(media: MediaAttachment[]): string {
    if (media.length === 0) {
      return '';
    }

    const lines: string[] = ['', '### Media'];

    for (const item of media) {
      switch (item.type) {
        case 'photo':
          lines.push(`- 📷 Photo: [View](${item.url})`);
          if (item.altText) {
            lines.push(`  - Alt: ${item.altText}`);
          }
          break;
        case 'video':
          lines.push(`- 🎥 Video: [Watch](${item.url})`);
          if (item.duration) {
            lines.push(`  - Duration: ${Math.round(item.duration)}s`);
          }
          break;
        case 'animated_gif':
          lines.push(`- 🎬 GIF: [View](${item.url})`);
          break;
      }
    }

    return lines.join('\n');
  }

  /**
   * Get media summary
   */
  getMediaSummary(media: MediaAttachment[]): string {
    if (media.length === 0) {
      return '';
    }

    const counts = {
      photo: 0,
      video: 0,
      animated_gif: 0,
    };

    for (const item of media) {
      counts[item.type]++;
    }

    const parts: string[] = [];
    if (counts.photo > 0) {
      parts.push(`${counts.photo} photo${counts.photo > 1 ? 's' : ''}`);
    }
    if (counts.video > 0) {
      parts.push(`${counts.video} video${counts.video > 1 ? 's' : ''}`);
    }
    if (counts.animated_gif > 0) {
      parts.push(`${counts.animated_gif} GIF${counts.animated_gif > 1 ? 's' : ''}`);
    }

    return parts.join(', ');
  }

  /**
   * Check if media should be included
   */
  shouldIncludeMedia(): boolean {
    return this.config.includeMedia;
  }
}
