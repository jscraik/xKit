/**
 * Bookmark folder management
 */

import { logger } from '../observability/logger.js';
import type { EnrichedBookmark } from '../bookmark-enrichment/types.js';
import type { TwitterClient } from '../lib/twitter-client.js';
import type { FolderConfig, FolderMapping } from './types.js';

export class FolderManager {
  private config: FolderConfig;

  constructor(config: Partial<FolderConfig> = {}) {
    this.config = {
      folders: config.folders || {},
      fetchFromFolders: config.fetchFromFolders ?? false,
    };
  }

  /**
   * Get folder tag name from folder ID
   */
  getFolderTag(folderId: string): string | undefined {
    return this.config.folders[folderId];
  }

  /**
   * Add folder tags to bookmarks
   */
  addFolderTags(bookmarks: EnrichedBookmark[], folderId?: string): EnrichedBookmark[] {
    if (!folderId) {
      return bookmarks;
    }

    const folderTag = this.getFolderTag(folderId);
    if (!folderTag) {
      return bookmarks;
    }

    return bookmarks.map((bookmark) => ({
      ...bookmark,
      tags: [...(bookmark.tags || []), folderTag],
      folder: folderTag,
    }));
  }

  /**
   * Fetch bookmarks from all configured folders
   */
  async fetchFromAllFolders(
    client: TwitterClient,
    options: {
      maxPerFolder?: number;
      onProgress?: (folderId: string, folderName: string, count: number) => void;
    } = {},
  ): Promise<Map<string, EnrichedBookmark[]>> {
    const folderBookmarks = new Map<string, EnrichedBookmark[]>();
    const maxPerFolder = options.maxPerFolder ?? 50;

    for (const [folderId, folderName] of Object.entries(this.config.folders)) {
      try {
        const result = await client.getBookmarkFolderTimeline(folderId, maxPerFolder);

        if (result.success && result.tweets) {
          // Convert tweets to enriched bookmarks (will be done by caller)
          folderBookmarks.set(folderId, result.tweets as any);

          if (options.onProgress) {
            options.onProgress(folderId, folderName, result.tweets.length);
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({
          event: 'folder_fetch_failed',
          folderId,
          folderName,
          error: errorMessage,
        }, 'Failed to fetch folder');
      }
    }

    return folderBookmarks;
  }

  /**
   * Get all configured folders
   */
  getFolders(): FolderMapping {
    return { ...this.config.folders };
  }

  /**
   * Add folder mapping
   */
  addFolder(folderId: string, tagName: string): void {
    this.config.folders[folderId] = tagName;
  }

  /**
   * Remove folder mapping
   */
  removeFolder(folderId: string): void {
    delete this.config.folders[folderId];
  }

  /**
   * Check if folders are configured
   */
  hasFolders(): boolean {
    return Object.keys(this.config.folders).length > 0;
  }

  /**
   * Get folder count
   */
  getFolderCount(): number {
    return Object.keys(this.config.folders).length;
  }
}
