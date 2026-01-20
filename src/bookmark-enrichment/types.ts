/**
 * Types for bookmark content enrichment
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';

/**
 * Expanded URL information
 */
export interface ExpandedUrl {
  original: string;
  expanded: string;
  finalUrl: string;
  redirectChain: string[];
}

/**
 * Extracted content from linked pages
 */
export interface LinkedContent {
  type: 'github' | 'article' | 'video' | 'podcast' | 'unknown';
  title?: string;
  description?: string;
  author?: string;
  publishedDate?: string;

  // GitHub-specific
  readme?: string;
  stars?: number;
  language?: string;
  topics?: string[];

  // Article-specific
  excerpt?: string;
  wordCount?: number;
  readingTime?: number;
  fullContent?: string;
  textContent?: string;
  contentLength?: number;
  siteName?: string;

  // Video/Podcast-specific
  duration?: number;
  transcript?: string;

  // AI-generated content
  summary?: string;
  keyPoints?: string[];
  aiGenerated?: boolean;
  aiModel?: string;
}

/**
 * Enriched bookmark with expanded URLs and extracted content
 */
export interface EnrichedBookmark extends BookmarkRecord {
  expandedUrls?: ExpandedUrl[];
  linkedContent?: LinkedContent[];
  extractedAt?: string;
  folder?: string;
  tags?: string[];
  threadTweets?: Array<{
    id: string;
    text: string;
    authorUsername: string;
    authorName: string;
    createdAt?: string;
    url: string;
  }>;
}

/**
 * Configuration for content enrichment
 */
export interface EnrichmentConfig {
  expandUrls: boolean;
  extractContent: boolean;
  followRedirects: boolean;
  maxRedirects: number;
  timeout: number;
  userAgent: string;
  enableFullContent?: boolean;
  enableSummarization?: boolean;
  ollamaModel?: string;
  fetchThreads?: boolean;
  summaryPersona?: string;
  summaryLength?: string;
  // Custom template support (Phase 4)
  summaryTemplate?: string;
  summaryTemplateVars?: Record<string, string>;
}
