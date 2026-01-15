/**
 * Unit tests for AnalysisEngine
 */

import * as fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisEngine, type Analyzer } from '../../src/bookmark-analysis/analysis-engine.js';
import type { AnalysisResult } from '../../src/bookmark-analysis/types.js';
import type { BookmarkExport, BookmarkRecord } from '../../src/bookmark-export/types.js';

describe('AnalysisEngine', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.mkdtemp('analysis-engine-test-');
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('readExportFile', () => {
    it('should read and parse a valid export file', async () => {
      const validExport: BookmarkExport = {
        metadata: {
          exportTimestamp: '2024-01-01T00:00:00.000Z',
          totalCount: 1,
          exporterVersion: '1.0.0',
          userId: 'user123',
          username: 'testuser',
        },
        bookmarks: [
          {
            id: '1',
            url: 'https://twitter.com/user/status/1',
            text: 'Test tweet',
            authorUsername: 'author',
            authorName: 'Author Name',
            createdAt: '2024-01-01T00:00:00.000Z',
            likeCount: 10,
            retweetCount: 5,
            replyCount: 2,
          },
        ],
      };

      const filePath = `${tempDir}/export.json`;
      await fs.writeFile(filePath, JSON.stringify(validExport));

      const engine = new AnalysisEngine({ analyzers: [] });
      const result = await engine.readExportFile(filePath);

      expect(result).toEqual(validExport);
    });

    it('should throw error for invalid JSON', async () => {
      const filePath = `${tempDir}/invalid.json`;
      await fs.writeFile(filePath, 'not valid json');

      const engine = new AnalysisEngine({ analyzers: [] });

      await expect(engine.readExportFile(filePath)).rejects.toThrow('Failed to parse JSON');
    });

    it('should throw error for data that fails schema validation', async () => {
      const invalidExport = {
        metadata: {
          exportTimestamp: '2024-01-01T00:00:00.000Z',
          // missing required fields
        },
        bookmarks: [],
      };

      const filePath = `${tempDir}/invalid-schema.json`;
      await fs.writeFile(filePath, JSON.stringify(invalidExport));

      const engine = new AnalysisEngine({ analyzers: [] });

      await expect(engine.readExportFile(filePath)).rejects.toThrow('Export validation failed');
    });

    it('should throw error for non-existent file', async () => {
      const engine = new AnalysisEngine({ analyzers: [] });

      await expect(engine.readExportFile('/nonexistent/file.json')).rejects.toThrow();
    });
  });

  describe('analyzeBookmark', () => {
    const sampleBookmark: BookmarkRecord = {
      id: '1',
      url: 'https://twitter.com/user/status/1',
      text: 'Test tweet',
      authorUsername: 'author',
      authorName: 'Author Name',
      createdAt: '2024-01-01T00:00:00.000Z',
      likeCount: 10,
      retweetCount: 5,
      replyCount: 2,
    };

    it('should return bookmark unchanged when no analyzers configured', async () => {
      const engine = new AnalysisEngine({ analyzers: [] });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result).toEqual(sampleBookmark);
    });

    it('should merge categories from analyzer', async () => {
      const mockAnalyzer: Analyzer = {
        name: 'test-categorizer',
        analyze: vi.fn().mockResolvedValue({
          categories: ['tech', 'programming'],
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [mockAnalyzer] });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.categories).toEqual(['tech', 'programming']);
      expect(mockAnalyzer.analyze).toHaveBeenCalledWith(sampleBookmark);
    });

    it('should merge usefulness score from analyzer', async () => {
      const mockAnalyzer: Analyzer = {
        name: 'test-scorer',
        analyze: vi.fn().mockResolvedValue({
          usefulnessScore: 85,
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [mockAnalyzer] });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.usefulnessScore).toBe(85);
    });

    it('should merge custom fields from analyzer', async () => {
      const mockAnalyzer: Analyzer = {
        name: 'test-custom',
        analyze: vi.fn().mockResolvedValue({
          customFields: {
            sentiment: 'positive',
            domain: 'example.com',
          },
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [mockAnalyzer] });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.customAnalysis).toEqual({
        sentiment: 'positive',
        domain: 'example.com',
      });
    });

    it('should merge results from multiple analyzers', async () => {
      const categorizerAnalyzer: Analyzer = {
        name: 'categorizer',
        analyze: vi.fn().mockResolvedValue({
          categories: ['tech'],
        } as AnalysisResult),
      };

      const scorerAnalyzer: Analyzer = {
        name: 'scorer',
        analyze: vi.fn().mockResolvedValue({
          usefulnessScore: 75,
        } as AnalysisResult),
      };

      const customAnalyzer: Analyzer = {
        name: 'custom',
        analyze: vi.fn().mockResolvedValue({
          customFields: { sentiment: 'positive' },
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({
        analyzers: [categorizerAnalyzer, scorerAnalyzer, customAnalyzer],
      });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.categories).toEqual(['tech']);
      expect(result.usefulnessScore).toBe(75);
      expect(result.customAnalysis).toEqual({ sentiment: 'positive' });
    });

    it('should combine categories from multiple analyzers', async () => {
      const analyzer1: Analyzer = {
        name: 'analyzer1',
        analyze: vi.fn().mockResolvedValue({
          categories: ['tech', 'programming'],
        } as AnalysisResult),
      };

      const analyzer2: Analyzer = {
        name: 'analyzer2',
        analyze: vi.fn().mockResolvedValue({
          categories: ['javascript'],
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [analyzer1, analyzer2] });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.categories).toEqual(['tech', 'programming', 'javascript']);
    });

    it('should use last usefulness score when multiple analyzers provide it', async () => {
      const analyzer1: Analyzer = {
        name: 'analyzer1',
        analyze: vi.fn().mockResolvedValue({
          usefulnessScore: 50,
        } as AnalysisResult),
      };

      const analyzer2: Analyzer = {
        name: 'analyzer2',
        analyze: vi.fn().mockResolvedValue({
          usefulnessScore: 80,
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [analyzer1, analyzer2] });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.usefulnessScore).toBe(80);
    });

    it('should merge custom fields from multiple analyzers', async () => {
      const analyzer1: Analyzer = {
        name: 'analyzer1',
        analyze: vi.fn().mockResolvedValue({
          customFields: { field1: 'value1' },
        } as AnalysisResult),
      };

      const analyzer2: Analyzer = {
        name: 'analyzer2',
        analyze: vi.fn().mockResolvedValue({
          customFields: { field2: 'value2' },
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [analyzer1, analyzer2] });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.customAnalysis).toEqual({
        field1: 'value1',
        field2: 'value2',
      });
    });

    it('should continue processing if an analyzer throws an error', async () => {
      const failingAnalyzer: Analyzer = {
        name: 'failing',
        analyze: vi.fn().mockRejectedValue(new Error('Analyzer failed')),
      };

      const workingAnalyzer: Analyzer = {
        name: 'working',
        analyze: vi.fn().mockResolvedValue({
          categories: ['tech'],
        } as AnalysisResult),
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const engine = new AnalysisEngine({
        analyzers: [failingAnalyzer, workingAnalyzer],
      });
      const result = await engine.analyzeBookmark(sampleBookmark);

      expect(result.categories).toEqual(['tech']);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error analyzing bookmark'), expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('analyzeExport', () => {
    const sampleExport: BookmarkExport = {
      metadata: {
        exportTimestamp: '2024-01-01T00:00:00.000Z',
        totalCount: 2,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
      },
      bookmarks: [
        {
          id: '1',
          url: 'https://twitter.com/user/status/1',
          text: 'First tweet',
          authorUsername: 'author1',
          authorName: 'Author One',
          createdAt: '2024-01-01T00:00:00.000Z',
          likeCount: 10,
          retweetCount: 5,
          replyCount: 2,
        },
        {
          id: '2',
          url: 'https://twitter.com/user/status/2',
          text: 'Second tweet',
          authorUsername: 'author2',
          authorName: 'Author Two',
          createdAt: '2024-01-02T00:00:00.000Z',
          likeCount: 20,
          retweetCount: 10,
          replyCount: 4,
        },
      ],
    };

    it('should analyze all bookmarks in export', async () => {
      const mockAnalyzer: Analyzer = {
        name: 'test-analyzer',
        analyze: vi.fn().mockResolvedValue({
          categories: ['tech'],
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [mockAnalyzer] });
      const result = await engine.analyzeExport(sampleExport);

      expect(result.bookmarks).toHaveLength(2);
      expect(result.bookmarks[0].categories).toEqual(['tech']);
      expect(result.bookmarks[1].categories).toEqual(['tech']);
      expect(mockAnalyzer.analyze).toHaveBeenCalledTimes(2);
    });

    it('should preserve original metadata fields', async () => {
      const engine = new AnalysisEngine({ analyzers: [] });
      const result = await engine.analyzeExport(sampleExport);

      expect(result.metadata.exportTimestamp).toBe(sampleExport.metadata.exportTimestamp);
      expect(result.metadata.totalCount).toBe(sampleExport.metadata.totalCount);
      expect(result.metadata.exporterVersion).toBe(sampleExport.metadata.exporterVersion);
      expect(result.metadata.userId).toBe(sampleExport.metadata.userId);
      expect(result.metadata.username).toBe(sampleExport.metadata.username);
    });

    it('should add analysis metadata', async () => {
      const mockAnalyzer: Analyzer = {
        name: 'test-analyzer',
        analyze: vi.fn().mockResolvedValue({
          categories: ['tech'],
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({
        analyzers: [mockAnalyzer],
        scoringMethod: 'heuristic',
      });
      const result = await engine.analyzeExport(sampleExport);

      expect(result.metadata.analysisTimestamp).toBeDefined();
      expect(result.metadata.scoringMethod).toBe('heuristic');
      expect(result.metadata.analyzersUsed).toEqual(['test-analyzer']);
    });

    it('should collect all unique categories', async () => {
      const mockAnalyzer: Analyzer = {
        name: 'test-analyzer',
        analyze: vi
          .fn()
          .mockResolvedValueOnce({ categories: ['tech', 'programming'] } as AnalysisResult)
          .mockResolvedValueOnce({ categories: ['tech', 'javascript'] } as AnalysisResult),
      };

      const engine = new AnalysisEngine({ analyzers: [mockAnalyzer] });
      const result = await engine.analyzeExport(sampleExport);

      expect(result.metadata.categoriesApplied).toEqual(expect.arrayContaining(['tech', 'programming', 'javascript']));
      expect(result.metadata.categoriesApplied).toHaveLength(3);
    });

    it('should default to "none" scoring method when not specified', async () => {
      const engine = new AnalysisEngine({ analyzers: [] });
      const result = await engine.analyzeExport(sampleExport);

      expect(result.metadata.scoringMethod).toBe('none');
    });
  });

  describe('analyze (complete workflow)', () => {
    it('should read file, validate, and analyze bookmarks', async () => {
      const validExport: BookmarkExport = {
        metadata: {
          exportTimestamp: '2024-01-01T00:00:00.000Z',
          totalCount: 1,
          exporterVersion: '1.0.0',
          userId: 'user123',
          username: 'testuser',
        },
        bookmarks: [
          {
            id: '1',
            url: 'https://twitter.com/user/status/1',
            text: 'Test tweet',
            authorUsername: 'author',
            authorName: 'Author Name',
            createdAt: '2024-01-01T00:00:00.000Z',
            likeCount: 10,
            retweetCount: 5,
            replyCount: 2,
          },
        ],
      };

      const filePath = `${tempDir}/export.json`;
      await fs.writeFile(filePath, JSON.stringify(validExport));

      const mockAnalyzer: Analyzer = {
        name: 'test-analyzer',
        analyze: vi.fn().mockResolvedValue({
          categories: ['tech'],
          usefulnessScore: 85,
        } as AnalysisResult),
      };

      const engine = new AnalysisEngine({
        analyzers: [mockAnalyzer],
        scoringMethod: 'llm',
      });
      const result = await engine.analyze(filePath);

      expect(result.bookmarks).toHaveLength(1);
      expect(result.bookmarks[0].categories).toEqual(['tech']);
      expect(result.bookmarks[0].usefulnessScore).toBe(85);
      expect(result.metadata.scoringMethod).toBe('llm');
      expect(result.metadata.analyzersUsed).toEqual(['test-analyzer']);
    });
  });
});
