/**
 * Main bookmark enrichment orchestrator
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';
import type { TwitterClient } from '../lib/twitter-client.js';
import { ContentExtractor } from './content-extractor.js';
import type { EnrichedBookmark, EnrichmentConfig } from './types.js';
import { UrlExpander } from './url-expander.js';

export class BookmarkEnricher {
  private urlExpander: UrlExpander;
  private contentExtractor: ContentExtractor;
  private config: EnrichmentConfig;
  private client?: TwitterClient;

  constructor(config: Partial<EnrichmentConfig> = {}, client?: TwitterClient) {
    this.config = {
      expandUrls: config.expandUrls ?? true,
      extractContent: config.extractContent ?? true,
      followRedirects: config.followRedirects ?? true,
      maxRedirects: config.maxRedirects ?? 10,
      timeout: config.timeout ?? 10000,
      userAgent: config.userAgent ?? 'xKit/1.0 (Bookmark Enrichment)',
      enableFullContent: config.enableFullContent ?? true,
      enableSummarization: config.enableSummarization ?? false,
      ollamaModel: config.ollamaModel,
      fetchThreads: config.fetchThreads ?? false,
      summaryPersona: config.summaryPersona,
      summaryLength: config.summaryLength,
    };

    this.client = client;

    this.urlExpander = new UrlExpander({
      maxRedirects: this.config.maxRedirects,
      timeout: this.config.timeout,
      userAgent: this.config.userAgent,
    });

    this.contentExtractor = new ContentExtractor({
      timeout: this.config.timeout,
      userAgent: this.config.userAgent,
      enableFullContent: this.config.enableFullContent,
      enableSummarization: this.config.enableSummarization,
      ollamaModel: this.config.ollamaModel,
      summaryPersona: this.config.summaryPersona,
      summaryLength: this.config.summaryLength,
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

    // Fetch thread if enabled and client is available
    if (this.config.fetchThreads && this.client) {
      try {
        const threadResult = await this.client.getThread(bookmark.id);
        if (threadResult.success && threadResult.tweets && threadResult.tweets.length > 1) {
          // Map thread tweets to simplified format
          enriched.threadTweets = threadResult.tweets.map((tweet) => ({
            id: tweet.id,
            text: tweet.text,
            authorUsername: tweet.author.username,
            authorName: tweet.author.name,
            createdAt: tweet.createdAt,
            url: `https://x.com/${tweet.author.username}/status/${tweet.id}`,
          }));
        }
      } catch (error) {
        // Silently fail thread fetching - not critical
      }
    }

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
