/**
 * Main bookmark enrichment orchestrator
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';
import { ContentExtractor } from './content-extractor.js';
import type { EnrichedBookmark, EnrichmentConfig } from './types.js';
import { UrlExpander } from './url-expander.js';

export class BookmarkEnricher {
  private urlExpander: UrlExpander;
  private contentExtractor: ContentExtractor;
  private config: EnrichmentConfig;

  constructor(config: Partial<EnrichmentConfig> = {}) {
    this.config = {
      expandUrls: config.expandUrls ?? true,
      extractContent: config.extractContent ?? true,
      followRedirects: config.followRedirects ?? true,
      maxRedirects: config.maxRedirects ?? 10,
      timeout: config.timeout ?? 10000,
      userAgent: config.userAgent ?? 'xKit/1.0 (Bookmark Enrichment)',
    };

    this.urlExpander = new UrlExpander({
      maxRedirects: this.config.maxRedirects,
      timeout: this.config.timeout,
      userAgent: this.config.userAgent,
    });

    this.contentExtractor = new ContentExtractor({
      timeout: this.config.timeout,
      userAgent: this.config.userAgent,
    });
  }

  /**
   * Enrich a single bookmark
   */
  async enrich(bookmark: BookmarkRecord): Promise<EnrichedBookmark> {
    const enriched: EnrichedBookmark = {
      ...bookmark,
      extractedAt: new Date().toISOString(),
    };

    // Extract URLs from tweet text
    const urls = this.urlExpander.extractUrls(bookmark.text);

    if (urls.length === 0) {
      return enriched;
    }

    // Expand URLs if enabled
    if (this.config.expandUrls) {
      const expandedUrls = await Promise.all(urls.map((url) => this.urlExpander.expand(url)));
      enriched.expandedUrls = expandedUrls;
    }

    // Extract content if enabled
    if (this.config.extractContent) {
      const urlsToExtract = enriched.expandedUrls ? enriched.expandedUrls.map((u) => u.finalUrl) : urls;

      const linkedContent = await Promise.all(urlsToExtract.map((url) => this.contentExtractor.extract(url)));

      enriched.linkedContent = linkedContent.filter(
        (content): content is NonNullable<typeof content> => content !== null,
      );
    }

    return enriched;
  }

  /**
   * Enrich multiple bookmarks
   */
  async enrichBatch(
    bookmarks: BookmarkRecord[],
    options: {
      concurrency?: number;
      onProgress?: (current: number, total: number) => void;
    } = {},
  ): Promise<EnrichedBookmark[]> {
    const concurrency = options.concurrency ?? 5;
    const results: EnrichedBookmark[] = [];
    let completed = 0;

    // Process in batches to avoid overwhelming the network
    for (let i = 0; i < bookmarks.length; i += concurrency) {
      const batch = bookmarks.slice(i, i + concurrency);
      const enrichedBatch = await Promise.all(batch.map((bookmark) => this.enrich(bookmark)));

      results.push(...enrichedBatch);
      completed += batch.length;

      if (options.onProgress) {
        options.onProgress(completed, bookmarks.length);
      }
    }

    return results;
  }
}
