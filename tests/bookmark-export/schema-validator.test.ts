/**
 * Tests for bookmark export schema validation
 */

import { describe, expect, it } from 'vitest';
import { validateBookmarkExport } from '../../src/bookmark-export/schema-validator.js';
import type { BookmarkExport } from '../../src/bookmark-export/types.js';

describe('Bookmark Export Schema Validation', () => {
  it('should validate a correct export', () => {
    const validExport: BookmarkExport = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
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
        },
      ],
    };

    expect(() => validateBookmarkExport(validExport)).not.toThrow();
    expect(validateBookmarkExport(validExport)).toBe(true);
  });

  it('should reject export with missing metadata fields', () => {
    const invalidExport = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        // missing totalCount, exporterVersion, userId, username
      },
      bookmarks: [],
    };

    expect(() => validateBookmarkExport(invalidExport)).toThrow(/validation failed/);
  });

  it('should reject export with missing bookmark fields', () => {
    const invalidExport = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: 1,
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
      },
      bookmarks: [
        {
          id: '123456789',
          // missing required fields
        },
      ],
    };

    expect(() => validateBookmarkExport(invalidExport)).toThrow(/validation failed/);
  });

  it('should reject export with negative counts', () => {
    const invalidExport = {
      metadata: {
        exportTimestamp: '2024-01-15T12:00:00Z',
        totalCount: -1, // negative count
        exporterVersion: '1.0.0',
        userId: 'user123',
        username: 'testuser',
      },
      bookmarks: [],
    };

    expect(() => validateBookmarkExport(invalidExport)).toThrow(/validation failed/);
  });
});
