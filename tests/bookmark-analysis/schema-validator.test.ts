/**
 * Tests for bookmark analysis schema validation
 */

import { describe, expect, it } from 'vitest';
import { validateAnalysisExport } from '../../src/bookmark-analysis/schema-validator.js';
import type { AnalysisExport } from '../../src/bookmark-analysis/types.js';

describe('Bookmark Analysis Schema Validation', () => {
  it('should validate a correct analysis export', () => {
    const validAnalysis: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-15T13:00:00Z',
        categoriesApplied: ['programming', 'typescript'],
        scoringMethod: 'hybrid',
        analyzersUsed: ['llm-categorizer', 'usefulness-scorer'],
      },
      bookmarks: [
        {
          id: '123456789',
          url: 'https://twitter.com/user/status/123456789',
          text: 'This is a test tweet',
          authorUsername: 'testuser',
          authorName: 'Test User',
          createdAt: '2024-01-15T12:00:00Z',
          likeCount: 10,
          retweetCount: 5,
          replyCount: 2,
          categories: ['programming'],
          usefulnessScore: 85,
        },
      ],
    };

    expect(() => validateAnalysisExport(validAnalysis)).not.toThrow();
    expect(validateAnalysisExport(validAnalysis)).toBe(true);
  });

  it('should reject analysis with missing analysis-specific metadata', () => {
    const invalidAnalysis = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        // missing analysisTimestamp, categoriesApplied, scoringMethod, analyzersUsed
      },
      bookmarks: [],
    };

    expect(() => validateAnalysisExport(invalidAnalysis)).toThrow(/validation failed/);
  });

  it('should reject analysis with invalid usefulness score', () => {
    const invalidAnalysis = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-15T13:00:00Z',
        categoriesApplied: [],
        scoringMethod: 'llm',
        analyzersUsed: [],
      },
      bookmarks: [
        {
          id: '123456789',
          url: 'https://twitter.com/user/status/123456789',
          text: 'This is a test tweet',
          authorUsername: 'testuser',
          authorName: 'Test User',
          createdAt: '2024-01-15T12:00:00Z',
          likeCount: 10,
          retweetCount: 5,
          replyCount: 2,
          usefulnessScore: 150, // invalid: > 100
        },
      ],
    };

    expect(() => validateAnalysisExport(invalidAnalysis)).toThrow(/validation failed/);
  });

  it('should accept analysis with optional fields omitted', () => {
    const validAnalysis: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-15T13:00:00Z',
        categoriesApplied: [],
        scoringMethod: 'none',
        analyzersUsed: [],
      },
      bookmarks: [
        {
          id: '123456789',
          url: 'https://twitter.com/user/status/123456789',
          text: 'This is a test tweet',
          authorUsername: 'testuser',
          authorName: 'Test User',
          createdAt: '2024-01-15T12:00:00Z',
          likeCount: 10,
          retweetCount: 5,
          replyCount: 2,
          // categories and usefulnessScore are optional
        },
      ],
    };

    expect(() => validateAnalysisExport(validAnalysis)).not.toThrow();
  });
});
