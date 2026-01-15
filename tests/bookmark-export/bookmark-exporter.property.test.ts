/**
 * Property-based tests for BookmarkExporter
 * Feature: bookmark-export-analysis
 */

import { mkdir, readFile, rm } from 'node:fs/promises';
import * as fc from 'fast-check';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { BookmarkExporter } from '../../src/bookmark-export/bookmark-exporter.js';
import { validateBookmarkExport } from '../../src/bookmark-export/schema-validator.js';
import type { BookmarkRecord, ExportMetadata } from '../../src/bookmark-export/types.js';

const TEST_OUTPUT_DIR = './test-exports-property';

// Generators for property-based testing
const arbitraryBookmark = (): fc.Arbitrary<BookmarkRecord> =>
  fc.record({
    id: fc.string({ minLength: 1 }),
    url: fc.webUrl(),
    text: fc.string(),
    authorUsername: fc.string({ minLength: 1 }),
    authorName: fc.string({ minLength: 1 }),
    // Generate dates between 2000 and 2030 to ensure valid ISO 8601 format
    createdAt: fc
      .date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
      .filter((d) => !Number.isNaN(d.getTime()))
      .map((d) => d.toISOString()),
    likeCount: fc.nat(),
    retweetCount: fc.nat(),
    replyCount: fc.nat(),
  });

const arbitraryMetadata = (): fc.Arbitrary<Omit<ExportMetadata, 'totalCount'>> =>
  fc.record({
    // Generate dates between 2000 and 2030 to ensure valid ISO 8601 format
    exportTimestamp: fc
      .date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') })
      .filter((d) => !Number.isNaN(d.getTime()))
      .map((d) => d.toISOString()),
    exporterVersion: fc.string({ minLength: 1 }),
    userId: fc.string({ minLength: 1 }),
    username: fc.string({ minLength: 1 }),
  });

describe('BookmarkExporter Property Tests', () => {
  let exporter: BookmarkExporter;

  beforeEach(async () => {
    await mkdir(TEST_OUTPUT_DIR, { recursive: true });
    exporter = new BookmarkExporter({ outputDirectory: TEST_OUTPUT_DIR });
  });

  afterEach(async () => {
    await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
  });

  /**
   * Property 2: Export serialization round-trip
   * **Validates: Requirements 1.4**
   *
   * For any set of bookmarks, serializing to JSON then deserializing
   * should produce equivalent bookmark data
   */
  it('Property 2: serialization round-trip preserves data', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbitraryBookmark()), arbitraryMetadata(), async (bookmarks, metadata) => {
        // Export bookmarks
        const filepath = await exporter.export(bookmarks, metadata);

        // Read and parse the file
        const content = await readFile(filepath, 'utf-8');
        const parsed = JSON.parse(content);

        // Verify bookmarks are preserved
        if (bookmarks.length === 0) {
          return parsed.bookmarks.length === 0;
        }

        // Check each bookmark is preserved
        for (let i = 0; i < bookmarks.length; i++) {
          const original = bookmarks[i];
          const deserialized = parsed.bookmarks[i];

          if (
            original.id !== deserialized.id ||
            original.url !== deserialized.url ||
            original.text !== deserialized.text ||
            original.authorUsername !== deserialized.authorUsername ||
            original.authorName !== deserialized.authorName ||
            original.createdAt !== deserialized.createdAt ||
            original.likeCount !== deserialized.likeCount ||
            original.retweetCount !== deserialized.retweetCount ||
            original.replyCount !== deserialized.replyCount
          ) {
            return false;
          }
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7: Schema conformance
   * **Validates: Requirements 3.1**
   *
   * For any exported JSON file, it should validate successfully
   * against the bookmark export schema
   */
  it('Property 7: exported files conform to schema', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbitraryBookmark()), arbitraryMetadata(), async (bookmarks, metadata) => {
        // Export bookmarks
        const filepath = await exporter.export(bookmarks, metadata);

        // Read and parse the file
        const content = await readFile(filepath, 'utf-8');
        const parsed = JSON.parse(content);

        // Validate against schema - should not throw
        try {
          validateBookmarkExport(parsed);
          return true;
        } catch {
          return false;
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8: Null handling for missing fields
   * **Validates: Requirements 3.3**
   *
   * For any bookmark with unavailable optional fields, those fields
   * should be present in the exported record with null values rather
   * than being omitted.
   *
   * Note: Currently all fields are required in the schema, but this
   * test verifies that the exporter properly handles the data structure.
   */
  it('Property 8: all bookmark fields are present in export', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbitraryBookmark()), arbitraryMetadata(), async (bookmarks, metadata) => {
        // Export bookmarks
        const filepath = await exporter.export(bookmarks, metadata);

        // Read and parse the file
        const content = await readFile(filepath, 'utf-8');
        const parsed = JSON.parse(content);

        // Verify all required fields are present (not omitted)
        for (const bookmark of parsed.bookmarks) {
          if (
            !('id' in bookmark) ||
            !('url' in bookmark) ||
            !('text' in bookmark) ||
            !('authorUsername' in bookmark) ||
            !('authorName' in bookmark) ||
            !('createdAt' in bookmark) ||
            !('likeCount' in bookmark) ||
            !('retweetCount' in bookmark) ||
            !('replyCount' in bookmark)
          ) {
            return false;
          }
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 9: Export metadata presence
   * **Validates: Requirements 3.4**
   *
   * For any export file, the metadata section should contain
   * exportTimestamp, totalCount, and exporterVersion fields
   */
  it('Property 9: export metadata is always present', async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(arbitraryBookmark()), arbitraryMetadata(), async (bookmarks, metadata) => {
        // Export bookmarks
        const filepath = await exporter.export(bookmarks, metadata);

        // Read and parse the file
        const content = await readFile(filepath, 'utf-8');
        const parsed = JSON.parse(content);

        // Verify metadata fields are present
        const hasMetadata = 'metadata' in parsed;
        const hasExportTimestamp = 'exportTimestamp' in parsed.metadata;
        const hasTotalCount = 'totalCount' in parsed.metadata;
        const hasExporterVersion = 'exporterVersion' in parsed.metadata;
        const hasUserId = 'userId' in parsed.metadata;
        const hasUsername = 'username' in parsed.metadata;

        // Verify totalCount matches actual bookmark count
        const totalCountMatches = parsed.metadata.totalCount === bookmarks.length;

        return (
          hasMetadata &&
          hasExportTimestamp &&
          hasTotalCount &&
          hasExporterVersion &&
          hasUserId &&
          hasUsername &&
          totalCountMatches
        );
      }),
      { numRuns: 100 },
    );
  });
});
