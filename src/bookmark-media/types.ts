/**
 * Types for media attachment handling
 */

export interface MediaAttachment {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  altText?: string;
}

export interface MediaConfig {
  includeMedia: boolean;
  downloadMedia: boolean;
  mediaDir: string;
}

export interface BookmarkWithMedia {
  id: string;
  media: MediaAttachment[];
}

// Re-export MediaDownloaderConfig from media-downloader for convenience
export type { MediaDownloaderConfig } from './media-downloader.js';
