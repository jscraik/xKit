/**
 * Analysis Engine - Orchestrates bookmark analysis using multiple analyzers
 */

import * as fs from 'node:fs/promises';
import { Logger } from '../bookmark-export/logger.js';
import { validateBookmarkExport } from '../bookmark-export/schema-validator.js';
import type { BookmarkExport, BookmarkRecord } from '../bookmark-export/types.js';
import type {
  AnalysisExport,
  AnalysisMetadata,
  AnalysisResult,
  EnrichedBookmarkRecord,
  ErrorSummary,
} from './types.js';

/**
 * Analyzer interface - all analyzers must implement this
 */
export interface Analyzer {
  name: string;
  analyze(bookmark: BookmarkRecord): Promise<AnalysisResult>;
}

/**
 * Configuration for the Analysis Engine
 */
export interface AnalysisEngineConfig {
  analyzers: Analyzer[];
  scoringMethod?: 'llm' | 'heuristic' | 'hybrid' | 'none';
  logger?: Logger;
}

/**
 * AnalysisEngine orchestrates multiple analyzers to enrich bookmark data
 *
 * Responsibilities:
 * - Read and parse exported JSON files
 * - Validate input against export schema
 * - Orchestrate multiple analyzers (LLM, scoring, scripts)
 * - Merge analysis results into bookmark records
 * - Handle errors gracefully with logging and partial results
 *
 * Validates: Requirements 4.1, 6.3, 8.2, 8.3
 */
export class AnalysisEngine {
  private analyzers: Analyzer[];
  private scoringMethod: string;
  private logger: Logger;
  private errorSummary: ErrorSummary;

  constructor(config: AnalysisEngineConfig) {
    this.analyzers = config.analyzers;
    this.scoringMethod = config.scoringMethod || 'none';
    this.logger = config.logger || new Logger();
    this.errorSummary = {
      totalErrors: 0,
      bookmarkErrors: [],
      criticalErrors: [],
    };
  }

  /**
   * Read and parse an exported JSON file
   * @param filePath - Path to the exported JSON file
   * @returns Parsed and validated bookmark export data
   * @throws Error if file cannot be read or parsed
   * @throws Error if data fails validation
   *
   * Validates: Requirement 4.1 - Analysis Engine SHALL read and parse exported JSON file
   */
  async readExportFile(filePath: string): Promise<BookmarkExport> {
    try {
      this.logger.info('Reading export file', { operation: 'readExportFile', filePath });
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(fileContent);

      // Validate against export schema
      validateBookmarkExport(data);

      this.logger.info('Successfully read and validated export file', {
        operation: 'readExportFile',
        filePath,
        bookmarkCount: data.bookmarks.length,
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (error instanceof SyntaxError) {
        this.logger.error(`Failed to parse JSON from ${filePath}`, {
          operation: 'readExportFile',
          filePath,
          error: errorMessage,
        });
        throw new Error(`Failed to parse JSON from ${filePath}: ${errorMessage}`);
      }

      this.logger.error(`Error reading export file`, {
        operation: 'readExportFile',
        filePath,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Analyze a single bookmark using all configured analyzers
   * @param bookmark - The bookmark to analyze
   * @returns Enriched bookmark with analysis results
   *
   * Validates: Requirements 6.3, 8.2 - Analysis Engine SHALL merge script output and log errors with context
   */
  async analyzeBookmark(bookmark: BookmarkRecord): Promise<EnrichedBookmarkRecord> {
    const enriched: EnrichedBookmarkRecord = { ...bookmark };

    // Run all analyzers and merge results
    for (const analyzer of this.analyzers) {
      try {
        const result = await analyzer.analyze(bookmark);

        // Merge categories
        if (result.categories) {
          if (!enriched.categories) {
            enriched.categories = [];
          }
          enriched.categories.push(...result.categories);
        }

        // Merge usefulness score (take the last one if multiple analyzers provide it)
        if (result.usefulnessScore !== undefined) {
          enriched.usefulnessScore = result.usefulnessScore;
        }

        // Merge custom fields
        if (result.customFields) {
          if (!enriched.customAnalysis) {
            enriched.customAnalysis = {};
          }
          enriched.customAnalysis = {
            ...enriched.customAnalysis,
            ...result.customFields,
          };
        }
      } catch (error) {
        // Log error with context and continue processing (non-fatal error)
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.logger.error(`Error analyzing bookmark with ${analyzer.name}`, {
          operation: 'analyzeBookmark',
          bookmarkId: bookmark.id,
          analyzerName: analyzer.name,
          error: errorMessage,
        });

        // Track error in summary
        this.errorSummary.totalErrors++;
        this.errorSummary.bookmarkErrors.push({
          bookmarkId: bookmark.id,
          analyzerName: analyzer.name,
          error: errorMessage,
        });

        // Continue with remaining analyzers (Requirement 8.2)
        console.error(`Error analyzing bookmark ${bookmark.id} with ${analyzer.name}:`, error);
      }
    }

    return enriched;
  }

  /**
   * Analyze all bookmarks from an export file
   * @param exportData - The bookmark export data
   * @returns Analysis export with enriched bookmarks
   *
   * Validates: Requirements 4.1, 6.3, 8.2
   */
  async analyzeExport(exportData: BookmarkExport): Promise<AnalysisExport> {
    const enrichedBookmarks: EnrichedBookmarkRecord[] = [];

    this.logger.info('Starting bookmark analysis', {
      operation: 'analyzeExport',
      totalBookmarks: exportData.bookmarks.length,
    });

    // Analyze each bookmark
    for (const bookmark of exportData.bookmarks) {
      const enriched = await this.analyzeBookmark(bookmark);
      enrichedBookmarks.push(enriched);
    }

    // Collect all unique categories
    const allCategories = new Set<string>();
    for (const bookmark of enrichedBookmarks) {
      if (bookmark.categories) {
        for (const category of bookmark.categories) {
          allCategories.add(category);
        }
      }
    }

    // Build analysis metadata with error summary
    const metadata: AnalysisMetadata = {
      ...exportData.metadata,
      analysisTimestamp: new Date().toISOString(),
      categoriesApplied: Array.from(allCategories),
      scoringMethod: this.scoringMethod,
      analyzersUsed: this.analyzers.map((a) => a.name),
    };

    // Include error summary if there were errors (Requirement 8.2, 8.3)
    if (this.errorSummary.totalErrors > 0 || this.errorSummary.criticalErrors.length > 0) {
      metadata.errorSummary = this.errorSummary;

      this.logger.warn('Analysis completed with errors', {
        operation: 'analyzeExport',
        totalErrors: this.errorSummary.totalErrors,
        criticalErrors: this.errorSummary.criticalErrors.length,
      });
    } else {
      this.logger.info('Analysis completed successfully', {
        operation: 'analyzeExport',
        totalBookmarks: enrichedBookmarks.length,
      });
    }

    return {
      metadata,
      bookmarks: enrichedBookmarks,
    };
  }

  /**
   * Write partial results to disk on critical failure
   * @param partialData - The partial analysis data
   * @param outputPath - Path where to write the partial results
   *
   * Validates: Requirement 8.3 - System SHALL write partial results on critical failures
   */
  async writePartialResults(partialData: AnalysisExport, outputPath: string): Promise<void> {
    try {
      // Add _partial suffix to filename
      const partialPath = outputPath.replace(/\.json$/, '_partial.json');

      this.logger.warn('Writing partial results due to critical failure', {
        operation: 'writePartialResults',
        outputPath: partialPath,
        bookmarksProcessed: partialData.bookmarks.length,
      });

      // Ensure parent directory exists
      const path = await import('node:path');
      const parentDir = path.dirname(partialPath);
      await fs.mkdir(parentDir, { recursive: true });

      await fs.writeFile(partialPath, JSON.stringify(partialData, null, 2), 'utf-8');

      this.logger.info('Partial results written successfully', {
        operation: 'writePartialResults',
        outputPath: partialPath,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to write partial results', {
        operation: 'writePartialResults',
        error: errorMessage,
      });
      // Don't throw - we're already in an error state
    }
  }

  /**
   * Get the current error summary
   * @returns The error summary
   */
  getErrorSummary(): ErrorSummary {
    return { ...this.errorSummary };
  }

  /**
   * Reset the error summary (useful for processing multiple files)
   */
  resetErrorSummary(): void {
    this.errorSummary = {
      totalErrors: 0,
      bookmarkErrors: [],
      criticalErrors: [],
    };
  }

  /**
   * Complete analysis workflow: read, validate, analyze
   * @param inputFilePath - Path to the exported JSON file
   * @param outputPath - Optional path for partial results on critical failure
   * @returns Analysis export with enriched bookmarks
   *
   * Validates: Requirements 4.1, 6.3, 8.2, 8.3
   */
  async analyze(inputFilePath: string, outputPath?: string): Promise<AnalysisExport> {
    try {
      // Read and validate input
      const exportData = await this.readExportFile(inputFilePath);

      // Analyze all bookmarks
      return await this.analyzeExport(exportData);
    } catch (error) {
      // Critical error - log and potentially write partial results
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.errorSummary.criticalErrors.push(errorMessage);

      this.logger.error('Critical error during analysis', {
        operation: 'analyze',
        inputFilePath,
        error: errorMessage,
      });

      // If we have partial data and an output path, write partial results
      if (outputPath) {
        // Try to create a minimal partial result with error info
        const partialResult: AnalysisExport = {
          metadata: {
            exportTimestamp: new Date().toISOString(),
            totalCount: 0,
            exporterVersion: 'unknown',
            userId: 'unknown',
            username: 'unknown',
            analysisTimestamp: new Date().toISOString(),
            categoriesApplied: [],
            scoringMethod: this.scoringMethod,
            analyzersUsed: this.analyzers.map((a) => a.name),
            errorSummary: this.errorSummary,
          },
          bookmarks: [],
        };

        await this.writePartialResults(partialResult, outputPath);
      }

      throw error;
    }
  }
}
