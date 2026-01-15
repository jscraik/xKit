/**
 * Tests for bookmark analysis types
 */

import { describe, expect, it } from 'vitest';
import type { AnalysisExport, AnalysisMetadata, EnrichedBookmarkRecord } from '../../src/bookmark-analysis/types.js';

describe('Bookmark Analysis Types', () => {
  it('should create an EnrichedBookmarkRecord with categories', () => {
    const enriched: EnrichedBookmarkRecord = {
      id: '123456789',
      url: 'https://twitter.com/user/status/123456789',
      text: 'This is a test tweet about TypeScript',
      authorUsername: 'testuser',
      authorName: 'Test User',
      createdAt: '2024-01-15T12:00:00Z',
      likeCount: 10,
      retweetCount: 5,
      replyCount: 2,
      categories: ['programming', 'typescript'],
      usefulnessScore: 85,
    };

    expect(enriched.categories).toContain('programming');
    expect(enriched.usefulnessScore).toBeGreaterThanOrEqual(0);
    expect(enriched.usefulnessScore).toBeLessThanOrEqual(100);
  });

  it('should create valid AnalysisMetadata', () => {
    const metadata: AnalysisMetadata = {
      exportTimestamp: '2024-01-15T12:00:00Z',
      totalCount: 100,
      exporterVersion: '1.0.0',
      userId: 'user123',
      username: 'testuser',
      analysisTimestamp: '2024-01-15T13:00:00Z',
      categoriesApplied: ['programming', 'typescript', 'javascript'],
      scoringMethod: 'hybrid',
      analyzersUsed: ['llm-categorizer', 'usefulness-scorer'],
    };

    expect(metadata.analyzersUsed).toHaveLength(2);
    expect(metadata.scoringMethod).toBe('hybrid');
  });

  it('should create a valid AnalysisExport', () => {
    const analysisExport: AnalysisExport = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
        analysisTimestamp: '2024-01-15T13:00:00Z',
        categoriesApplied: ['programming'],
        scoringMethod: 'llm',
        analyzersUsed: ['llm-categorizer'],
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
          usefulnessScore: 75,
        },
      ],
    };

    expect(analysisExport.bookmarks[0].categories).toBeDefined();
    expect(analysisExport.bookmarks[0].usefulnessScore).toBeDefined();
  });
});
