/**
 * Tests for enhanced filename generation.
 */

import { describe, it, expect } from 'vitest';
import {
  generateEnhancedFilename,
  formatDateForFilename,
  validatePathLength
} from '../../src/bookmark-markdown/filename';
import type { CategorizedBookmark } from '../../src/bookmark-categorization/types';

describe('generateEnhancedFilename', () => {
  it('should generate filename with linked content title', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Check this out',
      authorUsername: 'doodlestein',
      authorName: 'Doug',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tools',
      categoryAction: 'file',
      categoryFolder: './knowledge/tools',
      linkedContent: [
        {
          type: 'github',
          title: 'Meta Skill Repository'
        }
      ]
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toBe('2026-01-20-@doodlestein-tools-meta-skill-repository-abcdef.md');
  });

  it('should use tweet text excerpt when no linked content title', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Here is my thought on something important\nSecond line',
      authorUsername: 'doodlestein',
      authorName: 'Doug',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tweets',
      categoryAction: 'file',
      categoryFolder: './knowledge/tweets'
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toBe('2026-01-20-@doodlestein-tweets-here-is-my-thought-on-something-important-abcdef.md');
  });

  it('should handle missing author username with "unknown"', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Some tweet',
      authorUsername: '',
      authorName: '',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'general',
      categoryAction: 'file',
      categoryFolder: './knowledge/general'
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toBe('2026-01-20-unknown-general-some-tweet-abcdef.md');
  });

  it('should use "general" category when not specified', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Tweet text',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: '',
      categoryAction: 'file',
      categoryFolder: './knowledge/general'
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toContain('-general-');
  });

  it('should use "unknown" short ID when bookmark ID is missing', () => {
    const bookmark: CategorizedBookmark = {
      id: '',
      url: 'https://example.com',
      text: 'Tweet',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'articles',
      categoryAction: 'file',
      categoryFolder: './knowledge/articles'
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toMatch(/-unknown\.md$/);
  });

  it('should truncate title if filename exceeds 255 chars', () => {
    const longTitle = 'a'.repeat(300);
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: longTitle,
      authorUsername: 'userwithlongname',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tools',
      categoryAction: 'file',
      categoryFolder: './knowledge/tools'
    };

    const result = generateEnhancedFilename(bookmark);

    // Total filename should be <= 255 (including .md)
    expect(result.length).toBeLessThanOrEqual(255);
    expect(result).toMatch(/^2026-01-20-@userwithlongname-tools-.*-abcdef\.md$/);
  });

  it('should sanitize special characters in title', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Check out: C++ & Python #programming!',
      authorUsername: 'dev',
      authorName: 'Developer',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tools',
      categoryAction: 'file',
      categoryFolder: './knowledge/tools'
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toBe('2026-01-20-@dev-tools-check-out-c-python-programming-abcdef.md');
  });

  it('should handle empty linked content title', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Great article',
      authorUsername: 'reader',
      authorName: 'Reader',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'articles',
      categoryAction: 'file',
      categoryFolder: './knowledge/articles',
      linkedContent: [
        {
          type: 'article',
          title: ''
        }
      ]
    };

    const result = generateEnhancedFilename(bookmark);

    // Should fall back to tweet text
    expect(result).toBe('2026-01-20-@reader-articles-great-article-abcdef.md');
  });

  it('should take last 6 characters of ID as short ID', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdefghijklmno',
      url: 'https://example.com',
      text: 'Tweet',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tweets',
      categoryAction: 'file',
      categoryFolder: './knowledge/tweets'
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toMatch(/-jklmno\.md$/);
  });

  it('should handle Unicode characters in title via sanitization', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Café au lait',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tweets',
      categoryAction: 'file',
      categoryFolder: './knowledge/tweets'
    };

    const result = generateEnhancedFilename(bookmark);

    // sanitizeSlug converts non-alphanumerics to hyphens after NFC normalization
    // 'café' → NFC → 'café' → replace non-a-z0-9 → 'caf-' → trim → 'caf'
    expect(result).toBe('2026-01-20-@user-tweets-caf-au-lait-abcdef.md');
  });

  it('should handle multiple consecutive special characters', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Test!!!???---Title',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'general',
      categoryAction: 'file',
      categoryFolder: './knowledge/general'
    };

    const result = generateEnhancedFilename(bookmark);

    expect(result).toBe('2026-01-20-@user-general-test-title-abcdef.md');
  });
});

describe('formatDateForFilename', () => {
  it('should format ISO date string to YYYY-MM-DD', () => {
    const result = formatDateForFilename('2026-01-20T12:00:00.000Z');
    expect(result).toBe('2026-01-20');
  });

  it('should pad month and day with zeros', () => {
    const result = formatDateForFilename('2026-01-05T08:30:00.000Z');
    expect(result).toBe('2026-01-05');
  });

  it('should handle double-digit month and day', () => {
    const result = formatDateForFilename('2026-12-31T23:59:59.999Z');
    expect(result).toBe('2026-12-31');
  });

  it('should handle leap year dates', () => {
    const result = formatDateForFilename('2024-02-29T12:00:00.000Z');
    expect(result).toBe('2024-02-29');
  });
});

describe('validatePathLength', () => {
  it('should not throw for paths within limit', () => {
    const path = 'knowledge/2026/01-jan/@doodlestein (Doug)/tools/file.md';
    expect(() => validatePathLength(path)).not.toThrow();
  });

  it('should not throw for paths exactly at limit', () => {
    const path = 'a'.repeat(240);
    expect(() => validatePathLength(path)).not.toThrow();
  });

  it('should throw error for paths exceeding limit', () => {
    const path = 'knowledge/' + 'a'.repeat(250);
    expect(() => validatePathLength(path)).toThrow('Path length');
  });

  it('should include path preview in error message', () => {
    const path = 'knowledge/very/long/path/' + 'a'.repeat(300);
    try {
      validatePathLength(path);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('exceeds');
      expect((error as Error).message).toMatch(/knowledge\/very\/long\/path\/a{20,}\.\.\./);
    }
  });

  it('should show truncated preview for long paths in error', () => {
    const path = 'a'.repeat(250);
    try {
      validatePathLength(path);
      expect.fail('Should have thrown error');
    } catch (error) {
      expect((error as Error).message).toMatch(/exceeds 240: a{50}\.\.\./);
    }
  });
});

describe('Integration: filename components', () => {
  it('should generate consistent filenames for same input', () => {
    const bookmark: CategorizedBookmark = {
      id: '12345678901234567890abcdef',
      url: 'https://example.com',
      text: 'Test tweet',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tools',
      categoryAction: 'file',
      categoryFolder: './knowledge/tools'
    };

    const result1 = generateEnhancedFilename(bookmark);
    const result2 = generateEnhancedFilename(bookmark);

    expect(result1).toBe(result2);
  });

  it('should generate unique filenames for different bookmarks', () => {
    const bookmark1: CategorizedBookmark = {
      id: '1111111111111111',
      url: 'https://example.com',
      text: 'Tweet one',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tools',
      categoryAction: 'file',
      categoryFolder: './knowledge/tools'
    };

    const bookmark2: CategorizedBookmark = {
      id: '2222222222222222',
      url: 'https://example.com',
      text: 'Tweet two',
      authorUsername: 'user',
      authorName: 'User',
      createdAt: '2026-01-20T12:00:00.000Z',
      likeCount: 0,
      retweetCount: 0,
      replyCount: 0,
      category: 'tools',
      categoryAction: 'file',
      categoryFolder: './knowledge/tools'
    };

    const result1 = generateEnhancedFilename(bookmark1);
    const result2 = generateEnhancedFilename(bookmark2);

    expect(result1).not.toBe(result2);
    expect(result1).toMatch(/-111111\.md$/);
    expect(result2).toMatch(/-222222\.md$/);
  });
});
