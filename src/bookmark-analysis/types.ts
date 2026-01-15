/**
 * Core types for bookmark analysis functionality
 */

import type { BookmarkRecord, ExportMetadata } from '../bookmark-export/types.js';

/**
 * Error summary for tracking analysis errors
 */
export interface ErrorSummary {
  totalErrors: number;
  bookmarkErrors: Array<{
    bookmarkId: string;
    analyzerName: string;
    error: string;
  }>;
  criticalErrors: string[];
}

/**
 * Metadata included in analysis output files
 */
export interface AnalysisMetadata extends ExportMetadata {
  analysisTimestamp: string;
  categoriesApplied: string[];
  scoringMethod: string;
  analyzersUsed: string[];
  errorSummary?: ErrorSummary;
}

/**
 * Enriched bookmark record with analysis results
 */
export interface EnrichedBookmarkRecord extends BookmarkRecord {
  categories?: string[];
  usefulnessScore?: number;
  customAnalysis?: Record<string, unknown>;
}

/**
 * Complete analysis output structure
 */
export interface AnalysisExport {
  metadata: AnalysisMetadata;
  bookmarks: EnrichedBookmarkRecord[];
}

/**
 * Result from an individual analyzer
 */
export interface AnalysisResult {
  categories?: string[];
  usefulnessScore?: number;
  customFields?: Record<string, unknown>;
}

/**
 * LLM configuration for categorization and scoring
 */
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey: string;
  prompt: string;
  maxCategories: number;
}

/**
 * Scoring configuration
 */
export interface ScoringConfig {
  method: 'llm' | 'heuristic' | 'hybrid';
  weights: {
    engagement: number;
    recency: number;
    contentQuality: number;
  };
  llmConfig?: LLMConfig;
}
