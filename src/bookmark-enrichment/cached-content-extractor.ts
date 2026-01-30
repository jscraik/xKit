/**
 * Cached content extractor
 * Wraps ContentExtractor with caching support
 */

import type { LinkedContent } from './types.js';
import { ContentExtractor } from './content-extractor.js';
import { CacheManager, type ExtractOptions } from '../cache/cache-manager.js';

/**
 * Cached content extractor
 * Caches extracted content to avoid redundant API calls
 */
export class CachedContentExtractor {
  private contentExtractor: ContentExtractor;
  private cache: CacheManager;
  private cacheEnabled: boolean;
  private enableFullContent: boolean;

  constructor(
    options: {
      timeout?: number;
      userAgent?: string;
      enableFullContent?: boolean;
      enableSummarization?: boolean;
      ollamaModel?: string;
      cacheEnabled?: boolean;
      cachePath?: string;
    } = {}
  ) {
    this.cacheEnabled = options.cacheEnabled ?? true;
    this.enableFullContent = options.enableFullContent ?? true;
    this.cache = new CacheManager(options.cachePath);
    this.contentExtractor = new ContentExtractor(options);
  }

  /**
   * Extract content from URL with caching
   */
  async extract(url: string): Promise<LinkedContent | null> {
    // Check cache first
    if (this.cacheEnabled) {
      const cacheKey = this.cache.getExtractKey(url, {
        extractFullContent: this.enableFullContent,
      });

      const cached = this.cache.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as LinkedContent;
        } catch (error) {
          // Cache corrupted, delete and continue
          this.cache.delete(cacheKey);
        }
      }
    }

    // Cache miss - extract normally
    const result = await this.contentExtractor.extract(url);

    // Cache the result if successful
    if (this.cacheEnabled && result) {
      const cacheKey = this.getExtractKey(url, {
        extractFullContent: this.enableFullContent,
      });
      this.cache.set(cacheKey, JSON.stringify(result));
    }

    return result;
  }

  /**
   * Generate cache key for URL extraction
   */
  private getExtractKey(url: string, options: ExtractOptions): string {
    return this.cache.getExtractKey(url, options);
  }

  /**
   * Get cache manager instance
   */
  getCache(): CacheManager {
    return this.cache;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Disable cache for this instance
   */
  disableCache(): void {
    this.cacheEnabled = false;
  }

  /**
   * Enable cache for this instance
   */
  enableCache(): void {
    this.cacheEnabled = true;
  }
}
