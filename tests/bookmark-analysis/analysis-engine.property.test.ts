/**
 * Property-based tests for AnalysisEngine
 * Feature: bookmark-export-analysis
 */

import * as fs from 'node:fs/promises';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalysisEngine, type Analyzer } from '../../src/bookmark-analysis/analysis-engine.js';
import type { AnalysisResult } from '../../src/bookmark-analysis/types.js';
import type { BookmarkExport, BookmarkRecord } from '../../src/bookmark-export/types.js';

// Arbitrary generators for property-based testing

// Generate valid ISO 8601 date-time strings within a reasonable range
const arbitraryISODateTime = (): fc.Arbitrary<string> => {
  // Generate timestamps between 2000-01-01 and 2030-12-31
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2030-12-31').getTime();
  return fc.integer({ min: minTimestamp, max: maxTimestamp }).map((timestamp) => new Date(timestamp).toISOString());
};

const arbitraryBookmarkRecord = (): fc.Arbitrary<BookmarkRecord> => {
  return fc.record({
    id: fc.string({ minLength: 1 }),
    url: fc.webUrl(),
    text: fc.string(),
    authorUsername: fc.string({ minLength: 1 }),
    authorName: fc.string({ minLength: 1 }),
    createdAt: arbitraryISODateTime(),
    likeCount: fc.nat(),
    retweetCount: fc.nat(),
    replyCount: fc.nat(),
  });
};

const arbitraryBookmarkExport = (): fc.Arbitrary<BookmarkExport> => {
  return fc
    .record({
      metadata: fc.record({
        exportTimestamp: arbitraryISODateTime(),
        totalCount: fc.nat(),
        exporterVersion: fc.string({ minLength: 1 }),
        userId: fc.string({ minLength: 1 }),
        username: fc.string({ minLength: 1 }),
      }),
      bookmarks: fc.array(arbitraryBookmarkRecord(), { minLength: 0, maxLength: 20 }),
    })
    .map((data) => ({
      ...data,
      metadata: {
        ...data.metadata,
        totalCount: data.bookmarks.length,
      },
    }));
};

describe('AnalysisEngine - Property-Based Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp('analysis-engine-property-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Property 10: JSON parsing validity
   * For any valid bookmark export JSON file, the Analysis Engine should successfully parse it without errors
   * **Validates: Requirements 4.1**
   */
  it('Property 10: should successfully parse any valid bookmark export JSON file', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBookmarkExport(), async (exportData) => {
        // Write export data to a temporary file
        const filePath = `${tempDir}/export-${Date.now()}-${Math.random()}.json`;
        await fs.writeFile(filePath, JSON.stringify(exportData));

        // Create engine and attempt to read the file
        const engine = new AnalysisEngine({ analyzers: [] });

        // Should not throw an error
        const result = await engine.readExportFile(filePath);

        // Result should match the original data
        expect(result).toEqual(exportData);

        // Clean up
        await fs.unlink(filePath);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17: Original data preservation
   * For any bookmark in the analysis output, all original fields from the export should be preserved unchanged
   * **Validates: Requirements 7.2**
   */
  it('Property 17: should preserve all original bookmark fields during analysis', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBookmarkRecord(), async (originalBookmark) => {
        // Create a mock analyzer that adds analysis data
        const mockAnalyzer: Analyzer = {
          name: 'test-analyzer',
          analyze: async () =>
            ({
              categories: ['test-category'],
              usefulnessScore: 50,
              customFields: { testField: 'testValue' },
            }) as AnalysisResult,
        };

        const engine = new AnalysisEngine({ analyzers: [mockAnalyzer] });
        const enriched = await engine.analyzeBookmark(originalBookmark);

        // All original fields should be preserved
        expect(enriched.id).toBe(originalBookmark.id);
        expect(enriched.url).toBe(originalBookmark.url);
        expect(enriched.text).toBe(originalBookmark.text);
        expect(enriched.authorUsername).toBe(originalBookmark.authorUsername);
        expect(enriched.authorName).toBe(originalBookmark.authorName);
        expect(enriched.createdAt).toBe(originalBookmark.createdAt);
        expect(enriched.likeCount).toBe(originalBookmark.likeCount);
        expect(enriched.retweetCount).toBe(originalBookmark.retweetCount);
        expect(enriched.replyCount).toBe(originalBookmark.replyCount);

        // Analysis fields should be added
        expect(enriched.categories).toBeDefined();
        expect(enriched.usefulnessScore).toBeDefined();
        expect(enriched.customAnalysis).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 17 (extended): Original data preservation for complete exports
   * For any bookmark export, all original fields should be preserved in the analysis output
   * **Validates: Requirements 7.2**
   */
  it('Property 17 (extended): should preserve all original fields in complete export analysis', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBookmarkExport(), async (exportData) => {
        // Skip empty exports for this test
        if (exportData.bookmarks.length === 0) {
          return true;
        }

        const engine = new AnalysisEngine({ analyzers: [] });
        const result = await engine.analyzeExport(exportData);

        // Original metadata fields should be preserved
        expect(result.metadata.exportTimestamp).toBe(exportData.metadata.exportTimestamp);
        expect(result.metadata.totalCount).toBe(exportData.metadata.totalCount);
        expect(result.metadata.exporterVersion).toBe(exportData.metadata.exporterVersion);
        expect(result.metadata.userId).toBe(exportData.metadata.userId);
        expect(result.metadata.username).toBe(exportData.metadata.username);

        // All bookmarks should be present
        expect(result.bookmarks).toHaveLength(exportData.bookmarks.length);

        // Each bookmark's original fields should be preserved
        for (let i = 0; i < exportData.bookmarks.length; i++) {
          const original = exportData.bookmarks[i];
          const enriched = result.bookmarks[i];

          expect(enriched.id).toBe(original.id);
          expect(enriched.url).toBe(original.url);
          expect(enriched.text).toBe(original.text);
          expect(enriched.authorUsername).toBe(original.authorUsername);
          expect(enriched.authorName).toBe(original.authorName);
          expect(enriched.createdAt).toBe(original.createdAt);
          expect(enriched.likeCount).toBe(original.likeCount);
          expect(enriched.retweetCount).toBe(original.retweetCount);
          expect(enriched.replyCount).toBe(original.replyCount);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Analysis should handle empty bookmark arrays
   */
  it('should handle empty bookmark arrays without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          metadata: fc.record({
            exportTimestamp: arbitraryISODateTime(),
            totalCount: fc.constant(0),
            exporterVersion: fc.string({ minLength: 1 }),
            userId: fc.string({ minLength: 1 }),
            username: fc.string({ minLength: 1 }),
          }),
          bookmarks: fc.constant([] as BookmarkRecord[]),
        }),
        async (exportData) => {
          const engine = new AnalysisEngine({ analyzers: [] });
          const result = await engine.analyzeExport(exportData);

          expect(result.bookmarks).toHaveLength(0);
          expect(result.metadata.categoriesApplied).toHaveLength(0);
          expect(result.metadata.analyzersUsed).toHaveLength(0);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Additional property: Analysis metadata should always be added
   */
  it('should always add analysis metadata fields', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBookmarkExport(), async (exportData) => {
        const engine = new AnalysisEngine({ analyzers: [] });
        const result = await engine.analyzeExport(exportData);

        // Analysis metadata fields should always be present
        expect(result.metadata.analysisTimestamp).toBeDefined();
        expect(typeof result.metadata.analysisTimestamp).toBe('string');

        expect(result.metadata.categoriesApplied).toBeDefined();
        expect(Array.isArray(result.metadata.categoriesApplied)).toBe(true);

        expect(result.metadata.scoringMethod).toBeDefined();
        expect(typeof result.metadata.scoringMethod).toBe('string');

        expect(result.metadata.analyzersUsed).toBeDefined();
        expect(Array.isArray(result.metadata.analyzersUsed)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11: Category field presence
   * For any bookmark processed with LLM categorization, the output should include a categories field containing an array of category labels
   * **Validates: Requirements 4.2, 4.3, 4.4**
   */
  it('Property 11: should include categories field with array of labels when processed with LLM categorization', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBookmarkRecord(), async (bookmark) => {
        // Create a mock LLM categorizer that returns categories
        const mockLLMCategorizer: Analyzer = {
          name: 'LLMCategorizer',
          analyze: async (bm: BookmarkRecord) => {
            // Simulate LLM categorization behavior
            // Return categories based on bookmark text
            const categories = bm.text ? ['category1', 'category2', 'category3'] : ['uncategorized'];
            return { categories } as AnalysisResult;
          },
        };

        const engine = new AnalysisEngine({ analyzers: [mockLLMCategorizer] });
        const enriched = await engine.analyzeBookmark(bookmark);

        // The output should include a categories field
        expect(enriched.categories).toBeDefined();

        // The categories field should be an array
        expect(Array.isArray(enriched.categories)).toBe(true);

        // The categories array should contain category labels (strings)
        expect(enriched.categories.length).toBeGreaterThan(0);
        for (const category of enriched.categories) {
          expect(typeof category).toBe('string');
          expect(category.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11 (extended): Category field presence with multiple analyzers
   * For any bookmark processed with LLM categorization alongside other analyzers, the categories field should still be present
   * **Validates: Requirements 4.2, 4.3, 4.4**
   */
  it('Property 11 (extended): should include categories field even when multiple analyzers are used', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBookmarkRecord(), async (bookmark) => {
        // Create multiple analyzers including an LLM categorizer
        const mockLLMCategorizer: Analyzer = {
          name: 'LLMCategorizer',
          analyze: async () =>
            ({
              categories: ['tech', 'programming'],
            }) as AnalysisResult,
        };

        const mockScorer: Analyzer = {
          name: 'UsefulnessScorer',
          analyze: async () =>
            ({
              usefulnessScore: 75,
            }) as AnalysisResult,
        };

        const mockCustomAnalyzer: Analyzer = {
          name: 'CustomAnalyzer',
          analyze: async () =>
            ({
              customFields: { sentiment: 'positive' },
            }) as AnalysisResult,
        };

        const engine = new AnalysisEngine({
          analyzers: [mockLLMCategorizer, mockScorer, mockCustomAnalyzer],
        });
        const enriched = await engine.analyzeBookmark(bookmark);

        // Categories field should be present
        expect(enriched.categories).toBeDefined();
        expect(Array.isArray(enriched.categories)).toBe(true);
        expect(enriched.categories).toEqual(['tech', 'programming']);

        // Other analyzer results should also be present
        expect(enriched.usefulnessScore).toBe(75);
        expect(enriched.customAnalysis).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11 (edge case): Category field presence with empty text
   * For any bookmark with empty text processed with LLM categorization, the output should still include a categories field (typically with "uncategorized")
   * **Validates: Requirements 4.2, 4.3, 4.4, 4.5**
   */
  it('Property 11 (edge case): should include categories field even for bookmarks with empty text', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBookmarkRecord().map((bm) => ({ ...bm, text: '' })),
        async (bookmark) => {
          // Create a mock LLM categorizer that handles empty text
          const mockLLMCategorizer: Analyzer = {
            name: 'LLMCategorizer',
            analyze: async (bm: BookmarkRecord) => {
              // Simulate LLM categorization behavior for empty text
              const categories = bm.text ? ['category'] : ['uncategorized'];
              return { categories } as AnalysisResult;
            },
          };

          const engine = new AnalysisEngine({ analyzers: [mockLLMCategorizer] });
          const enriched = await engine.analyzeBookmark(bookmark);

          // Categories field should still be present
          expect(enriched.categories).toBeDefined();
          expect(Array.isArray(enriched.categories)).toBe(true);
          expect(enriched.categories.length).toBeGreaterThan(0);

          // For empty text, should typically be "uncategorized"
          expect(enriched.categories).toContain('uncategorized');
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Additional property: Analyzer errors should not prevent other analyzers from running
   */
  it('should continue processing with remaining analyzers when one fails', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBookmarkRecord(), async (bookmark) => {
        const failingAnalyzer: Analyzer = {
          name: 'failing-analyzer',
          analyze: async () => {
            throw new Error('Analyzer failed');
          },
        };

        const workingAnalyzer: Analyzer = {
          name: 'working-analyzer',
          analyze: async () =>
            ({
              categories: ['test'],
            }) as AnalysisResult,
        };

        // Suppress console.error for this test
        const originalError = console.error;
        console.error = () => {};

        const engine = new AnalysisEngine({
          analyzers: [failingAnalyzer, workingAnalyzer],
        });
        const result = await engine.analyzeBookmark(bookmark);

        // Restore console.error
        console.error = originalError;

        // Working analyzer should have added categories
        expect(result.categories).toEqual(['test']);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 20: Partial results on critical failure
   * For any critical error that prevents completion, the system should write partial results to disk along with an error summary
   * **Validates: Requirements 8.3**
   */
  it('Property 20: should write partial results with error summary on critical failure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), fc.string({ minLength: 1 }), async (invalidPath, outputPath) => {
        // Ensure the invalid path doesn't accidentally exist
        const nonExistentPath = `/nonexistent/${invalidPath}/${Date.now()}/file.json`;
        const outputFilePath = `${tempDir}/${outputPath.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;

        const engine = new AnalysisEngine({ analyzers: [] });

        // Attempt to analyze a non-existent file (critical error)
        let threwError = false;
        try {
          await engine.analyze(nonExistentPath, outputFilePath);
        } catch (error) {
          threwError = true;
        }

        // Should throw an error
        expect(threwError).toBe(true);

        // Partial results file should be created
        const partialPath = outputFilePath.replace(/\.json$/, '_partial.json');
        const partialContent = await fs.readFile(partialPath, 'utf-8');
        const partialData = JSON.parse(partialContent);

        // Partial results should have metadata with error summary
        expect(partialData.metadata).toBeDefined();
        expect(partialData.metadata.errorSummary).toBeDefined();

        // Error summary should contain critical errors
        expect(partialData.metadata.errorSummary.criticalErrors).toBeDefined();
        expect(Array.isArray(partialData.metadata.errorSummary.criticalErrors)).toBe(true);
        expect(partialData.metadata.errorSummary.criticalErrors.length).toBeGreaterThan(0);

        // Critical error should contain information about the failure
        const criticalError = partialData.metadata.errorSummary.criticalErrors[0];
        expect(typeof criticalError).toBe('string');
        expect(criticalError.length).toBeGreaterThan(0);

        // Partial results should have bookmarks array (even if empty)
        expect(partialData.bookmarks).toBeDefined();
        expect(Array.isArray(partialData.bookmarks)).toBe(true);

        // Clean up
        await fs.unlink(partialPath);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 20 (extended): Partial results should include all error summary fields
   * For any critical error, the error summary should include totalErrors, bookmarkErrors, and criticalErrors
   * **Validates: Requirements 8.3**
   */
  it('Property 20 (extended): should include complete error summary structure in partial results', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (invalidPath) => {
        const nonExistentPath = `/nonexistent/${invalidPath}/${Date.now()}/file.json`;
        const outputFilePath = `${tempDir}/output-${Date.now()}.json`;

        const engine = new AnalysisEngine({ analyzers: [] });

        try {
          await engine.analyze(nonExistentPath, outputFilePath);
        } catch (error) {
          // Expected to throw
        }

        // Read partial results
        const partialPath = outputFilePath.replace(/\.json$/, '_partial.json');
        const partialContent = await fs.readFile(partialPath, 'utf-8');
        const partialData = JSON.parse(partialContent);

        // Error summary should have all required fields
        const errorSummary = partialData.metadata.errorSummary;
        expect(errorSummary.totalErrors).toBeDefined();
        expect(typeof errorSummary.totalErrors).toBe('number');

        expect(errorSummary.bookmarkErrors).toBeDefined();
        expect(Array.isArray(errorSummary.bookmarkErrors)).toBe(true);

        expect(errorSummary.criticalErrors).toBeDefined();
        expect(Array.isArray(errorSummary.criticalErrors)).toBe(true);
        expect(errorSummary.criticalErrors.length).toBeGreaterThan(0);

        // Clean up
        await fs.unlink(partialPath);
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property 20 (extended): Partial results filename should follow naming convention
   * For any critical error, the partial results file should have "_partial" suffix before the extension
   * **Validates: Requirements 8.3**
   */
  it('Property 20 (extended): should use _partial suffix for partial results filename', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('/')),
        async (filename) => {
          const nonExistentPath = `/nonexistent/${Date.now()}/file.json`;
          const outputFilePath = `${tempDir}/${filename}.json`;

          const engine = new AnalysisEngine({ analyzers: [] });

          try {
            await engine.analyze(nonExistentPath, outputFilePath);
          } catch (error) {
            // Expected to throw
          }

          // Partial results should be at the expected path
          const expectedPartialPath = `${tempDir}/${filename}_partial.json`;
          const partialExists = await fs
            .access(expectedPartialPath)
            .then(() => true)
            .catch(() => false);

          expect(partialExists).toBe(true);

          // Clean up
          if (partialExists) {
            await fs.unlink(expectedPartialPath);
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 20 (extended): Partial results should be valid JSON
   * For any critical error, the partial results file should contain valid, parseable JSON
   * **Validates: Requirements 8.3**
   */
  it('Property 20 (extended): should write valid JSON for partial results', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (invalidPath) => {
        const nonExistentPath = `/nonexistent/${invalidPath}/${Date.now()}/file.json`;
        const outputFilePath = `${tempDir}/output-${Date.now()}.json`;

        const engine = new AnalysisEngine({ analyzers: [] });

        try {
          await engine.analyze(nonExistentPath, outputFilePath);
        } catch (error) {
          // Expected to throw
        }

        // Read partial results
        const partialPath = outputFilePath.replace(/\.json$/, '_partial.json');
        const partialContent = await fs.readFile(partialPath, 'utf-8');

        // Should not throw when parsing
        expect(() => JSON.parse(partialContent)).not.toThrow();

        // Parsed content should be an object
        const parsed = JSON.parse(partialContent);
        expect(typeof parsed).toBe('object');
        expect(parsed).not.toBeNull();

        // Clean up
        await fs.unlink(partialPath);
      }),
      { numRuns: 50 },
    );
  });
});
