/**
 * Unit tests for AnalysisOutputWriter
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AnalysisOutputWriter } from '../../src/bookmark-analysis/analysis-output-writer.js';
import type { AnalysisExport, EnrichedBookmarkRecord } from '../../src/bookmark-analysis/types.js';

describe('AnalysisOutputWriter', () => {
  const testOutputDir = './test-analysis-output';

  beforeEach(() => {
    // Create test output directory
    if (!existsSync(testOutputDir)) {
      mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test output directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  /**
   * Test: Serialize enriched bookmarks to JSON
   * Validates: Requirement 7.1
   */
  it('should serialize enriched bookmarks to JSON', async () => {
    const writer = new AnalysisOutputWriter({ outputDirectory: testOutputDir });

    const enrichedBookmarks: EnrichedBookmarkRecord[] = [
      {
        id: '1234567890',
        url: 'https://twitter.com/user/status/1234567890',
        text: 'Test bookmark',
        authorUsername: 'testuser',
        authorName: 'Test User',
        createdAt: '2024-01-01T00:00:00.000Z',
        likeCount: 10,
        retweetCount: 5,
        replyCount: 2,
        categories: ['technology', 'programming'],
        usefulnessScore: 85,
      },
    ];

    const analysisData: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-01T01:00:00.000Z',
        categoriesApplied: ['technology', 'programming'],
        scoringMethod: 'llm',
        analyzersUsed: ['LLMCategorizer', 'UsefulnessScorer'],
      },
      bookmarks: enrichedBookmarks,
    };

    const filepath = await writer.write(analysisData);

    // Verify file was created
    expect(existsSync(filepath)).toBe(true);

    // Verify content is valid JSON
    const content = await readFile(filepath, 'utf-8');
    const parsed = JSON.parse(content);

    // Verify structure
    expect(parsed.metadata).toBeDefined();
    expect(parsed.bookmarks).toBeDefined();
    expect(parsed.bookmarks).toHaveLength(1);
    expect(parsed.bookmarks[0].categories).toEqual(['technology', 'programming']);
    expect(parsed.bookmarks[0].usefulnessScore).toBe(85);
  });

  /**
   * Test: Include analysis metadata
   * Validates: Requirement 7.3
   */
  it('should include analysis metadata in output', async () => {
    const writer = new AnalysisOutputWriter({ outputDirectory: testOutputDir });

    const analysisData: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        totalCount: 0,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-01T01:00:00.000Z',
        categoriesApplied: ['technology', 'science'],
        scoringMethod: 'hybrid',
        analyzersUsed: ['LLMCategorizer', 'UsefulnessScorer', 'CustomScript'],
      },
      bookmarks: [],
    };

    const filepath = await writer.write(analysisData);
    const content = await readFile(filepath, 'utf-8');
    const parsed = JSON.parse(content);

    // Verify all required metadata fields are present
    expect(parsed.metadata.analysisTimestamp).toBe('2024-01-01T01:00:00.000Z');
    expect(parsed.metadata.categoriesApplied).toEqual(['technology', 'science']);
    expect(parsed.metadata.scoringMethod).toBe('hybrid');
    expect(parsed.metadata.analyzersUsed).toEqual(['LLMCategorizer', 'UsefulnessScorer', 'CustomScript']);
  });

  /**
   * Test: Filename includes analysis type and timestamp
   * Validates: Requirement 7.4
   */
  it('should use filename with analysis type and timestamp', async () => {
    const writer = new AnalysisOutputWriter({ outputDirectory: testOutputDir });

    const analysisData: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        totalCount: 0,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-01T01:00:00.000Z',
        categoriesApplied: [],
        scoringMethod: 'heuristic',
        analyzersUsed: [],
      },
      bookmarks: [],
    };

    const filepath = await writer.write(analysisData);

    // Verify filename pattern includes method and timestamp
    expect(filepath).toMatch(/bookmarks_analyzed_heuristic_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
  });

  /**
   * Test: Handle file collision with unique suffix
   * Validates: Requirement 7.5
   */
  it('should handle file collision with unique suffix', async () => {
    const writer = new AnalysisOutputWriter({ outputDirectory: testOutputDir });

    // Use a fixed filename pattern to ensure collision
    writer.setFilenamePattern('test_analysis.json');

    const analysisData: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        totalCount: 0,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-01T01:00:00.000Z',
        categoriesApplied: [],
        scoringMethod: 'llm',
        analyzersUsed: [],
      },
      bookmarks: [],
    };

    // Write first file
    const filepath1 = await writer.write(analysisData);
    expect(existsSync(filepath1)).toBe(true);

    // Write second file with same pattern (should get unique suffix)
    const filepath2 = await writer.write(analysisData);
    expect(existsSync(filepath2)).toBe(true);

    // Write third file (should get another unique suffix)
    const filepath3 = await writer.write(analysisData);
    expect(existsSync(filepath3)).toBe(true);

    // All three files should have different paths
    expect(filepath1).not.toBe(filepath2);
    expect(filepath2).not.toBe(filepath3);
    expect(filepath1).not.toBe(filepath3);

    // First file should be the base name
    expect(filepath1).toBe(join(testOutputDir, 'test_analysis.json'));

    // Second and third should have suffixes
    expect(filepath2).toMatch(/test_analysis_\d+_\d+\.json/);
    expect(filepath3).toMatch(/test_analysis_\d+_\d+\.json/);
  });

  /**
   * Test: Validate output against analysis schema
   * Validates: Requirement 7.3
   */
  it('should validate output against analysis schema', async () => {
    const writer = new AnalysisOutputWriter({ outputDirectory: testOutputDir });

    // Invalid data - missing required metadata fields
    const invalidData = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        // Missing required fields
      },
      bookmarks: [],
    } as unknown as AnalysisExport;

    // Should throw validation error
    await expect(writer.write(invalidData)).rejects.toThrow(/validation failed/i);
  });

  /**
   * Test: Preserve original bookmark fields
   * Validates: Requirement 7.2
   */
  it('should preserve all original bookmark fields', async () => {
    const writer = new AnalysisOutputWriter({ outputDirectory: testOutputDir });

    const enrichedBookmarks: EnrichedBookmarkRecord[] = [
      {
        id: '1234567890',
        url: 'https://twitter.com/user/status/1234567890',
        text: 'Original text content',
        authorUsername: 'originaluser',
        authorName: 'Original User',
        createdAt: '2024-01-01T00:00:00.000Z',
        likeCount: 100,
        retweetCount: 50,
        replyCount: 25,
        categories: ['new-category'],
        usefulnessScore: 90,
        customAnalysis: { sentiment: 'positive' },
      },
    ];

    const analysisData: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-01T01:00:00.000Z',
        categoriesApplied: ['new-category'],
        scoringMethod: 'llm',
        analyzersUsed: ['LLMCategorizer'],
      },
      bookmarks: enrichedBookmarks,
    };

    const filepath = await writer.write(analysisData);
    const content = await readFile(filepath, 'utf-8');
    const parsed = JSON.parse(content);

    const bookmark = parsed.bookmarks[0];

    // Verify all original fields are preserved
    expect(bookmark.id).toBe('1234567890');
    expect(bookmark.url).toBe('https://twitter.com/user/status/1234567890');
    expect(bookmark.text).toBe('Original text content');
    expect(bookmark.authorUsername).toBe('originaluser');
    expect(bookmark.authorName).toBe('Original User');
    expect(bookmark.createdAt).toBe('2024-01-01T00:00:00.000Z');
    expect(bookmark.likeCount).toBe(100);
    expect(bookmark.retweetCount).toBe(50);
    expect(bookmark.replyCount).toBe(25);

    // Verify analysis fields are also present
    expect(bookmark.categories).toEqual(['new-category']);
    expect(bookmark.usefulnessScore).toBe(90);
    expect(bookmark.customAnalysis).toEqual({ sentiment: 'positive' });
  });

  /**
   * Test: Custom output directory
   */
  it('should support custom output directory', async () => {
    const customDir = './test-custom-analysis';
    mkdirSync(customDir, { recursive: true });

    try {
      const writer = new AnalysisOutputWriter({ outputDirectory: customDir });

      const analysisData: AnalysisExport = {
        metadata: {
          exportTimestamp: '2024-01-01T00:00:00.000Z',
          totalCount: 0,
          exporterVersion: '1.0.0',
          userId: 'user123',
          username: 'testuser',
          analysisTimestamp: '2024-01-01T01:00:00.000Z',
          categoriesApplied: [],
          scoringMethod: 'llm',
          analyzersUsed: [],
        },
        bookmarks: [],
      };

      const filepath = await writer.write(analysisData);

      // Check that the path starts with the custom directory (without ./)
      expect(filepath).toContain('test-custom-analysis');
      expect(existsSync(filepath)).toBe(true);
    } finally {
      rmSync(customDir, { recursive: true, force: true });
    }
  });

  /**
   * Test: Custom filename pattern
   */
  it('should support custom filename pattern', async () => {
    const writer = new AnalysisOutputWriter({
      outputDirectory: testOutputDir,
      filenamePattern: 'custom_{method}_analysis_{timestamp}.json',
    });

    const analysisData: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        totalCount: 0,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-01T01:00:00.000Z',
        categoriesApplied: [],
        scoringMethod: 'hybrid',
        analyzersUsed: [],
      },
      bookmarks: [],
    };

    const filepath = await writer.write(analysisData);

    // Check the filename pattern (allowing for milliseconds in timestamp)
    expect(filepath).toMatch(/custom_hybrid_analysis_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
  });
});
