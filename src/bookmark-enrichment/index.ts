/**
 * Bookmark enrichment module
 * Expands URLs and extracts content from linked pages
 */

export { tweetDataBatchToBookmarkRecords, tweetDataToBookmarkRecord } from './adapters.js';
export { ArticleExtractor } from './article-extractor.js';
export type { ArticleContent } from './article-extractor.js';
export { ContentExtractor } from './content-extractor.js';
export { BookmarkEnricher } from './enricher.js';
export { OllamaClient } from './ollama-client.js';
export type { OllamaConfig, SummaryResult } from './ollama-client.js';
export type {
  EnrichedBookmark,
  EnrichmentConfig,
  ExpandedUrl,
  LinkedContent
} from './types.js';
export { UrlExpander } from './url-expander.js';

