/**
 * Media attachment handler
 */

import { resolve } from 'node:path';
import type { TweetMedia } from '../lib/twitter-client-types.js';
import { logger } from '../observability/logger.js';
import { MediaDownloader, type DownloadResult } from './media-downloader.js';
import { MediaStorage } from './media-storage.js';
import type { MediaAttachment, MediaConfig } from './types.js';

/**
 * Regex for extracting file extension from URL
 */
const EXTENSION_REGEX = /\.([a-z0-9]+)(?:\?|$)/i;

/**
 * Extended config for MediaHandler with download options
 */
export interface MediaHandlerConfig extends MediaConfig {
  /** Maximum concurrent downloads (default: 3) */
  maxConcurrent?: number;
  /** Maximum retry attempts for downloads (default: 3) */
  maxRetries?: number;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number;
}

export class MediaHandler {
  private config: MediaHandlerConfig;
  private downloader: MediaDownloader;
  private storage: MediaStorage;

  constructor(config: Partial<MediaHandlerConfig> = {}) {
    this.config = {
      includeMedia: config.includeMedia ?? false,
      downloadMedia: config.downloadMedia ?? false,
      mediaDir: config.mediaDir ?? './media',
      maxConcurrent: config.maxConcurrent ?? 3,
      maxRetries: config.maxRetries ?? 3,
      requestTimeout: config.requestTimeout ?? 30000,
    };

    // Initialize downloader and storage
    this.downloader = new MediaDownloader({
      maxConcurrent: this.config.maxConcurrent,
      maxRetries: this.config.maxRetries,
      requestTimeout: this.config.requestTimeout,
    });

    this.storage = new MediaStorage();
  }

  /**
   * Extract media from tweet
   * Optionally downloads media if downloadMedia is enabled
   */
  async extractMedia(tweetMedia?: TweetMedia[]): Promise<MediaAttachment[]> {
    if (!this.config.includeMedia || !tweetMedia || tweetMedia.length === 0) {
      return [];
    }

    const media = tweetMedia.map((media) => this.convertMedia(media));

    // Optionally download media
    if (this.config.downloadMedia) {
      const targetDir = resolve(this.config.mediaDir);
      await this.storage.ensureDir(targetDir);
      const downloadedPaths = await this.downloadMedia(media, targetDir);

      logger.info(
        {
          total: media.length,
          downloaded: downloadedPaths.filter(Boolean).length,
          failed: downloadedPaths.filter((p) => !p).length,
        },
        'Media download complete',
      );
    }

    return media;
  }

  /**
   * Download media items to target directory
   *
   * Downloads each media item using MediaDownloader and MediaStorage.
   * Uses graceful degradation: logs errors but continues on failures.
   *
   * @param media - Array of media attachments to download
   * @param targetDir - Directory to save downloaded files
   * @returns Promise resolving to array of local file paths (undefined for failures)
   */
  async downloadMedia(media: MediaAttachment[], targetDir: string): Promise<(string | undefined)[]> {
    const downloadPromises = media.map(async (item) => {
      try {
        // Generate filename using storage utility
        const extension = this.getExtension(item.url, item.type);
        const filename = this.storage.getFilename(item.url, extension);
        const targetPath = resolve(targetDir, filename);

        // Check if file already exists
        const exists = await this.storage.exists(targetPath);
        if (exists) {
          logger.debug({ url: item.url, targetPath }, 'Media file already exists, skipping download');
          return targetPath;
        }

        // Download based on media type
        let result: DownloadResult;
        if (item.type === 'photo' || item.type === 'animated_gif') {
          result = await this.downloader.downloadImage(item.url, targetPath);
        } else if (item.type === 'video') {
          result = await this.downloader.downloadVideo(item.url, targetPath);
        } else {
          logger.warn({ type: item.type, url: item.url }, 'Unknown media type, skipping download');
          return undefined;
        }

        if (result.success) {
          return targetPath;
        } else {
          logger.error({ url: item.url, error: result.error }, 'Failed to download media');
          return undefined;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ url: item.url, error: message }, 'Exception during media download');
        return undefined;
      }
    });

    return Promise.all(downloadPromises);
  }

  /**
   * Get file extension from URL and media type
   *
   * @param url - Media URL
   * @param type - Media type
   * @returns File extension (e.g., 'jpg', 'mp4')
   */
  private getExtension(url: string, type: MediaAttachment['type']): string {
    // Try to extract extension from URL
    const urlMatch = url.match(EXTENSION_REGEX);
    if (urlMatch) {
      const ext = urlMatch[1].toLowerCase();
      const allowed = ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webp'];
      if (allowed.includes(ext)) {
        return ext;
      }
    }

    // Fall back to media type defaults
    const typeDefaults: Record<MediaAttachment['type'], string> = {
      photo: 'jpg',
      video: 'mp4',
      animated_gif: 'gif',
    };

    return typeDefaults[type] || 'bin';
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
