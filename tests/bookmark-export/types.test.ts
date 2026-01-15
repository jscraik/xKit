/**
 * Tests for bookmark export types
 */

import { describe, expect, it } from 'vitest';
import type { BookmarkExport, BookmarkRecord, ExportMetadata } from '../../src/bookmark-export/types.js';

describe('Bookmark Export Types', () => {
  it('should create a valid BookmarkRecord', () => {
    const record: BookmarkRecord = {
      id: '123456789',
      url: 'https://twitter.com/user/status/123456789',
      text: 'This is a test tweet',
      authorUsername: 'testuser',
      authorName: 'Test User',
      createdAt: '2024-01-15T12:00:00Z',
      likeCount: 10,
      retweetCount: 5,
      replyCount: 2,
    };

    expect(record.id).toBe('123456789');
    expect(record.likeCount).toBeGreaterThanOrEqual(0);
  });

  it('should create valid ExportMetadata', () => {
    const metadata: ExportMetadata = {
      exportTimestamp: '2024-01-15T12:00:00Z',
      totalCount: 100,
      exporterVersion: '1.0.0',
      userId: 'user123',
      username: 'testuser',
    };

    expect(metadata.totalCount).toBeGreaterThanOrEqual(0);
    expect(metadata.exporterVersion).toBeTruthy();
  });

  it('should create a valid BookmarkExport', () => {
    const bookmarkExport: BookmarkExport = {
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

    expect(bookmarkExport.metadata.totalCount).toBe(1);
    expect(bookmarkExport.bookmarks).toHaveLength(1);
  });
});
