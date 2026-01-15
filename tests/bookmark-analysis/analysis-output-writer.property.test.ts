/**
 * Property-based tests for AnalysisOutputWriter
 * Feature: bookmark-export-analysis
 */

import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalysisOutputWriter } from '../../src/bookmark-analysis/analysis-output-writer.js';
import type { AnalysisExport, EnrichedBookmarkRecord } from '../../src/bookmark-analysis/types.js';

// Arbitrary generators for property-based testing

// Generate valid ISO 8601 date-time strings within a reasonable range
const arbitraryISODateTime = (): fc.Arbitrary<string> => {
  // Generate timestamps between 2000-01-01 and 2030-12-31
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2030-12-31').getTime();
  return fc.integer({ min: minTimestamp, max: maxTimestamp }).map((timestamp) => new Date(timestamp).toISOString());
};

const arbitraryEnrichedBookmarkRecord = (): fc.Arbitrary<EnrichedBookmarkRecord> => {
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
    categories: fc.option(fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }), { nil: undefined }),
    usefulnessScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
    customAnalysis: fc.option(
      fc.dictionary(
        fc.string({ minLength: 1 }),
        fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.double(), fc.constant(null)),
      ),
      { nil: undefined },
    ),
  });
};

const arbitraryScoringMethod = (): fc.Arbitrary<string> => {
  return fc.oneof(fc.constant('llm'), fc.constant('heuristic'), fc.constant('hybrid'), fc.constant('none'));
};

const arbitraryAnalysisExport = (): fc.Arbitrary<AnalysisExport> => {
  return fc
    .record({
      metadata: fc.record({
        exportTimestamp: arbitraryISODateTime(),
        totalCount: fc.nat(),
        exporterVersion: fc.string({ minLength: 1 }),
        userId: fc.string({ minLength: 1 }),
        username: fc.string({ minLength: 1 }),
        analysisTimestamp: arbitraryISODateTime(),
        categoriesApplied: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 10 }),
        scoringMethod: arbitraryScoringMethod(),
        analyzersUsed: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }),
      }),
      bookmarks: fc.array(arbitraryEnrichedBookmarkRecord(), { minLength: 0, maxLength: 20 }),
    })
    .map((data) => ({
      ...data,
      metadata: {
        ...data.metadata,
        totalCount: data.bookmarks.length,
      },
    }));
};

describe('AnalysisOutputWriter - Property-Based Tests', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp('analysis-output-writer-property-test-');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Property 18: Analysis output completeness
   * For any completed analysis, the output JSON file should contain analysis metadata
   * (analysisTimestamp, categoriesApplied, scoringMethod) and follow the naming pattern
   * indicating analysis type and timestamp
   * **Validates: Requirements 7.1, 7.3, 7.4**
   */
  it('Property 18: should produce complete output with all required metadata and proper filename', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAnalysisExport(), async (analysisData) => {
        const writer = new AnalysisOutputWriter({ outputDirectory: tempDir });

        // Write the analysis data
        const filepath = await writer.write(analysisData);

        // Requirement 7.1: File should be created
        expect(existsSync(filepath)).toBe(true);

        // Requirement 7.4: Filename should indicate analysis type (scoring method) and timestamp
        const filename = filepath.split('/').pop() || '';

        // Should contain the scoring method
        expect(filename).toContain(analysisData.metadata.scoringMethod);

        // Should contain a timestamp pattern (YYYY-MM-DDTHH-MM-SS format)
        expect(filename).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);

        // Should be a JSON file
        expect(filename).toMatch(/\.json$/);

        // Read and parse the output file
        const content = await fs.readFile(filepath, 'utf-8');
        const parsed = JSON.parse(content);

        // Requirement 7.3: Output should contain all required analysis metadata fields
        expect(parsed.metadata).toBeDefined();
        expect(parsed.metadata.analysisTimestamp).toBeDefined();
        expect(typeof parsed.metadata.analysisTimestamp).toBe('string');

        expect(parsed.metadata.categoriesApplied).toBeDefined();
        expect(Array.isArray(parsed.metadata.categoriesApplied)).toBe(true);

        expect(parsed.metadata.scoringMethod).toBeDefined();
        expect(typeof parsed.metadata.scoringMethod).toBe('string');

        // Verify the metadata values match the input
        expect(parsed.metadata.analysisTimestamp).toBe(analysisData.metadata.analysisTimestamp);
        expect(parsed.metadata.categoriesApplied).toEqual(analysisData.metadata.categoriesApplied);
        expect(parsed.metadata.scoringMethod).toBe(analysisData.metadata.scoringMethod);

        // Requirement 7.1: Output should contain bookmarks array
        expect(parsed.bookmarks).toBeDefined();
        expect(Array.isArray(parsed.bookmarks)).toBe(true);
        expect(parsed.bookmarks.length).toBe(analysisData.bookmarks.length);

        // Clean up
        await fs.unlink(filepath);
      }),
      { numRuns: 100 },
    );
  }, 30000); // 30 second timeout for property-based test

  /**
   * Property 18 (extended): Analysis output completeness with empty bookmarks
   * For any completed analysis with no bookmarks, the output should still contain all required metadata
   * **Validates: Requirements 7.1, 7.3, 7.4**
   */
  it('Property 18 (extended): should produce complete output even with empty bookmarks array', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          metadata: fc.record({
            exportTimestamp: arbitraryISODateTime(),
            totalCount: fc.constant(0),
            exporterVersion: fc.string({ minLength: 1 }),
            userId: fc.string({ minLength: 1 }),
            username: fc.string({ minLength: 1 }),
            analysisTimestamp: arbitraryISODateTime(),
            categoriesApplied: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }),
            scoringMethod: arbitraryScoringMethod(),
            analyzersUsed: fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 3 }),
          }),
          bookmarks: fc.constant([]),
        }),
        async (analysisData) => {
          const writer = new AnalysisOutputWriter({ outputDirectory: tempDir });
          const filepath = await writer.write(analysisData);

          // File should exist
          expect(existsSync(filepath)).toBe(true);

          // Read and verify content
          const content = await fs.readFile(filepath, 'utf-8');
          const parsed = JSON.parse(content);

          // All required metadata should be present
          expect(parsed.metadata.analysisTimestamp).toBeDefined();
          expect(parsed.metadata.categoriesApplied).toBeDefined();
          expect(parsed.metadata.scoringMethod).toBeDefined();

          // Bookmarks array should be empty but present
          expect(parsed.bookmarks).toEqual([]);

          // Clean up
          await fs.unlink(filepath);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 18 (extended): Filename pattern consistency
   * For any two analyses with the same scoring method, the filenames should follow the same pattern
   * **Validates: Requirements 7.4**
   */
  it('Property 18 (extended): should follow consistent filename pattern for same scoring method', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryScoringMethod(),
        fc.array(arbitraryEnrichedBookmarkRecord(), { minLength: 0, maxLength: 5 }),
        fc.array(arbitraryEnrichedBookmarkRecord(), { minLength: 0, maxLength: 5 }),
        async (scoringMethod, bookmarks1, bookmarks2) => {
          const writer = new AnalysisOutputWriter({ outputDirectory: tempDir });

          const analysisData1: AnalysisExport = {
            metadata: {
              exportTimestamp: '2024-01-01T00:00:00.000Z',
              totalCount: bookmarks1.length,
              exporterVersion: '1.0.0',
              userId: 'user1',
              username: 'testuser1',
              analysisTimestamp: '2024-01-01T01:00:00.000Z',
              categoriesApplied: ['tech'],
              scoringMethod,
              analyzersUsed: ['test'],
            },
            bookmarks: bookmarks1,
          };

          const analysisData2: AnalysisExport = {
            metadata: {
              exportTimestamp: '2024-01-02T00:00:00.000Z',
              totalCount: bookmarks2.length,
              exporterVersion: '1.0.0',
              userId: 'user2',
              username: 'testuser2',
              analysisTimestamp: '2024-01-02T01:00:00.000Z',
              categoriesApplied: ['science'],
              scoringMethod,
              analyzersUsed: ['test'],
            },
            bookmarks: bookmarks2,
          };

          const filepath1 = await writer.write(analysisData1);
          const filepath2 = await writer.write(analysisData2);

          const filename1 = filepath1.split('/').pop() || '';
          const filename2 = filepath2.split('/').pop() || '';

          // Both filenames should contain the scoring method
          expect(filename1).toContain(scoringMethod);
          expect(filename2).toContain(scoringMethod);

          // Both should follow the timestamp pattern
          expect(filename1).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
          expect(filename2).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);

          // Both should be JSON files
          expect(filename1).toMatch(/\.json$/);
          expect(filename2).toMatch(/\.json$/);

          // Clean up
          await fs.unlink(filepath1);
          await fs.unlink(filepath2);
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 18 (extended): Metadata completeness with various analyzer combinations
   * For any analysis with different analyzer combinations, all metadata fields should be present
   * **Validates: Requirements 7.3**
   */
  it('Property 18 (extended): should include complete metadata regardless of analyzer combination', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 10 }),
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 10 }),
        arbitraryScoringMethod(),
        async (categoriesApplied, analyzersUsed, scoringMethod) => {
          const writer = new AnalysisOutputWriter({ outputDirectory: tempDir });

          const analysisData: AnalysisExport = {
            metadata: {
              exportTimestamp: '2024-01-01T00:00:00.000Z',
              totalCount: 0,
              exporterVersion: '1.0.0',
              userId: 'user123',
              username: 'testuser',
              analysisTimestamp: '2024-01-01T01:00:00.000Z',
              categoriesApplied,
              scoringMethod,
              analyzersUsed,
            },
            bookmarks: [],
          };

          const filepath = await writer.write(analysisData);
          const content = await fs.readFile(filepath, 'utf-8');
          const parsed = JSON.parse(content);

          // All metadata fields should be present and match
          expect(parsed.metadata.analysisTimestamp).toBe(analysisData.metadata.analysisTimestamp);
          expect(parsed.metadata.categoriesApplied).toEqual(categoriesApplied);
          expect(parsed.metadata.scoringMethod).toBe(scoringMethod);
          expect(parsed.metadata.analyzersUsed).toEqual(analyzersUsed);

          // Clean up
          await fs.unlink(filepath);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Output should be valid JSON
   * For any analysis data, the output file should contain valid, parseable JSON
   */
  it('should always produce valid JSON output', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAnalysisExport(), async (analysisData) => {
        const writer = new AnalysisOutputWriter({ outputDirectory: tempDir });
        const filepath = await writer.write(analysisData);

        // Read the file
        const content = await fs.readFile(filepath, 'utf-8');

        // Should not throw when parsing
        expect(() => JSON.parse(content)).not.toThrow();

        // Parsed content should be an object
        const parsed = JSON.parse(content);
        expect(typeof parsed).toBe('object');
        expect(parsed).not.toBeNull();

        // Clean up
        await fs.unlink(filepath);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Output should preserve all input data
   * For any analysis data, the output file should contain all the input data unchanged
   * Note: JSON serialization removes undefined values, so we compare after round-trip
   */
  it('should preserve all input data in output', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAnalysisExport(), async (analysisData) => {
        const writer = new AnalysisOutputWriter({ outputDirectory: tempDir });
        const filepath = await writer.write(analysisData);

        const content = await fs.readFile(filepath, 'utf-8');
        const parsed = JSON.parse(content);

        // JSON.stringify removes undefined values, so we need to compare after serialization
        const expectedAfterSerialization = JSON.parse(JSON.stringify(analysisData));

        // Deep equality check
        expect(parsed).toEqual(expectedAfterSerialization);

        // Clean up
        await fs.unlink(filepath);
      }),
      { numRuns: 100 },
    );
  });
});
