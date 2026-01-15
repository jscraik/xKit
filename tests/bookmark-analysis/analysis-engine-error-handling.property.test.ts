/**
 * Property-based tests for AnalysisEngine error handling
 * Feature: bookmark-export-analysis
 */

import * as fs from 'node:fs/promises';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisEngine, type Analyzer } from '../../src/bookmark-analysis/analysis-engine.js';
import type { BookmarkRecord } from '../../src/bookmark-export/types.js';

// Arbitrary generators
const arbitraryBookmarkRecord = (): fc.Arbitrary<BookmarkRecord> => {
  return fc.record({
    id: fc.string({ minLength: 1 }),
    url: fc.webUrl(),
    text: fc.string(),
    authorUsername: fc.string({ minLength: 1 }),
    authorName: fc.string({ minLength: 1 }),
    createdAt: fc.date().map((d) => d.toISOString()),
    likeCount: fc.nat(),
    retweetCount: fc.nat(),
    replyCount: fc.nat(),
  });
};

describe('AnalysisEngine - Error Handling Property Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp('analysis-engine-error-property-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Property 20: Partial results on critical failure
   * For any critical error that prevents completion, the system should write partial results
   * to disk along with an error summary
   * **Validates: Requirements 8.3**
   */
  it('Property 20: should write partial results with error summary on critical failure', async () => {
    await fc.assert(
      fc.asyncProperty(fc.string({ minLength: 1 }), async (outputFilename) => {
        const outputPath = `${tempDir}/${outputFilename}.json`;
        const engine = new AnalysisEngine({ analyzers: [] });

        // Trigger critical error by trying to read non-existent file
        const nonExistentPath = `/nonexistent/${Math.random()}.json`;

        try {
          await engine.analyze(nonExistentPath, outputPath);
          // Should not reach here
          expect.fail('Should have thrown an error');
        } catch (error) {
          // Expected to throw
        }

        // Verify partial results file was created
        const partialPath = outputPath.replace(/\.json$/, '_partial.json');
        const partialExists = await fs
          .access(partialPath)
          .then(() => true)
          .catch(() => false);
        expect(partialExists).toBe(true);

        // Verify partial results content
        const partialContent = await fs.readFile(partialPath, 'utf-8');
        const partialData = JSON.parse(partialContent);

        // Should have error summary
        expect(partialData.metadata.errorSummary).toBeDefined();
        expect(partialData.metadata.errorSummary.criticalErrors).toBeDefined();
        expect(partialData.metadata.errorSummary.criticalErrors.length).toBeGreaterThan(0);

        // Should have metadata
        expect(partialData.metadata.analysisTimestamp).toBeDefined();
        expect(partialData.metadata.scoringMethod).toBeDefined();

        // Should have bookmarks array (even if empty)
        expect(partialData.bookmarks).toBeDefined();
        expect(Array.isArray(partialData.bookmarks)).toBe(true);
      }),
      { numRuns: 50 },
    );
  }, 30000);

  /**
   * Property: Non-fatal errors should not prevent completion
   * For any bookmark with analyzer failures, the system should continue processing
   */
  it('should continue processing all bookmarks despite analyzer failures', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbitraryBookmarkRecord(), { minLength: 1, maxLength: 10 }), async (bookmarks) => {
        const failingAnalyzer: Analyzer = {
          name: 'failing-analyzer',
          analyze: vi.fn().mockRejectedValue(new Error('Analyzer failed')),
        };

        const engine = new AnalysisEngine({ analyzers: [failingAnalyzer] });

        const exportData = {
          metadata: {
            exportTimestamp: new Date().toISOString(),
            totalCount: bookmarks.length,
            exporterVersion: '1.0.0',
            userId: 'test',
            username: 'test',
          },
          bookmarks,
        };

        const result = await engine.analyzeExport(exportData);

        // All bookmarks should be processed
        expect(result.bookmarks).toHaveLength(bookmarks.length);

        // Error summary should be included
        expect(result.metadata.errorSummary).toBeDefined();
        expect(result.metadata.errorSummary?.totalErrors).toBe(bookmarks.length);
      }),
      { numRuns: 50 },
    );
  });
});
