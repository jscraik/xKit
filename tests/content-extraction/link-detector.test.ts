/**
 * Tests for link-detector utility
 */

import { describe, expect, it } from 'vitest';
import { detectLinkType, extractXArticleId, type LinkType } from '../../src/content-extraction/link-detector.js';

describe('detectLinkType', () => {
  describe('GitHub links', () => {
    it('should detect GitHub repository URLs', () => {
      expect(detectLinkType('https://github.com/user/repo')).toBe('github');
      expect(detectLinkType('https://github.com/user/repo/issues/123')).toBe('github');
      expect(detectLinkType('http://github.com/org/project')).toBe('github');
    });

    it('should detect GitHub with various subdomains', () => {
      expect(detectLinkType('https://www.github.com/user/repo')).toBe('github');
      expect(detectLinkType('https://gist.github.com/user/abc123')).toBe('github');
    });
  });

  describe('Video links', () => {
    it('should detect YouTube URLs', () => {
      expect(detectLinkType('https://youtube.com/watch?v=abc123')).toBe('video');
      expect(detectLinkType('https://www.youtube.com/watch?v=xyz789')).toBe('video');
      expect(detectLinkType('http://youtu.be/abc123')).toBe('video');
    });

    it('should detect YouTube short URLs', () => {
      expect(detectLinkType('https://youtu.be/dQw4w9WgXcQ')).toBe('video');
    });
  });

  describe('X/Twitter article links', () => {
    it('should detect X article URLs', () => {
      expect(detectLinkType('https://x.com/i/article/123456')).toBe('x-article');
      expect(detectLinkType('https://www.x.com/i/article/789012')).toBe('x-article');
    });

    it('should detect Twitter article URLs', () => {
      expect(detectLinkType('https://twitter.com/i/article/345678')).toBe('x-article');
    });

    it('should take priority over other X/Twitter patterns', () => {
      // x-article should be detected before tweet
      expect(detectLinkType('https://x.com/i/article/12345')).toBe('x-article');
    });
  });

  describe('X/Twitter media links', () => {
    it('should detect X photo URLs', () => {
      expect(detectLinkType('https://x.com/user/status/123/photo/1')).toBe('media');
      expect(detectLinkType('https://twitter.com/user/status/456/photo/2')).toBe('media');
    });

    it('should detect X video URLs', () => {
      expect(detectLinkType('https://x.com/user/status/123/video/1')).toBe('media');
      expect(detectLinkType('https://twitter.com/user/status/456/video/2')).toBe('media');
    });
  });

  describe('X/Twitter tweet links', () => {
    it('should detect X status URLs', () => {
      expect(detectLinkType('https://x.com/user/status/123456')).toBe('tweet');
      expect(detectLinkType('https://www.x.com/user/status/789012')).toBe('tweet');
    });

    it('should detect Twitter status URLs', () => {
      expect(detectLinkType('https://twitter.com/user/status/123456')).toBe('tweet');
      expect(detectLinkType('https://www.twitter.com/user/status/789012')).toBe('tweet');
    });

    it('should detect X home page', () => {
      expect(detectLinkType('https://x.com')).toBe('tweet');
      expect(detectLinkType('https://x.com/home')).toBe('tweet');
    });
  });

  describe('Image links', () => {
    it('should detect direct image URLs', () => {
      expect(detectLinkType('https://example.com/photo.jpg')).toBe('image');
      expect(detectLinkType('https://example.com/image.jpeg')).toBe('image');
      expect(detectLinkType('https://example.com/picture.png')).toBe('image');
      expect(detectLinkType('https://example.com/animation.gif')).toBe('image');
      expect(detectLinkType('https://example.com/image.webp')).toBe('image');
      expect(detectLinkType('https://example.com/graphic.svg')).toBe('image');
    });

    it('should be case-insensitive for extensions', () => {
      expect(detectLinkType('https://example.com/photo.JPG')).toBe('image');
      expect(detectLinkType('https://example.com/photo.PNG')).toBe('image');
    });
  });

  describe('Article links (default)', () => {
    it('should classify general web pages as articles', () => {
      expect(detectLinkType('https://example.com/article')).toBe('article');
      expect(detectLinkType('https://news.example.com/story')).toBe('article');
      expect(detectLinkType('https://blog.example.com/post')).toBe('article');
    });

    it('should handle URLs with query parameters', () => {
      expect(detectLinkType('https://example.com/page?param=value')).toBe('article');
      expect(detectLinkType('https://example.com/post#section')).toBe('article');
    });
  });

  describe('Security validation', () => {
    it('should reject non-http protocols', () => {
      expect(() => detectLinkType('javascript:alert(1)')).toThrow('Invalid URL protocol: javascript:');
      expect(() => detectLinkType('data:text/html,<script>alert(1)</script>')).toThrow('Invalid URL protocol: data:');
      expect(() => detectLinkType('file:///etc/passwd')).toThrow('Invalid URL protocol: file:');
      expect(() => detectLinkType('ftp://example.com/file')).toThrow('Invalid URL protocol: ftp:');
    });

    it('should accept http and https protocols', () => {
      expect(detectLinkType('http://example.com')).toBe('article');
      expect(detectLinkType('https://example.com')).toBe('article');
    });

    it('should handle invalid URLs', () => {
      expect(() => detectLinkType('not-a-url')).toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle mixed case URLs', () => {
      expect(detectLinkType('HTTPS://GITHUB.COM/USER/REPO')).toBe('github');
      expect(detectLinkType('https://YouTube.com/watch?v=abc')).toBe('video');
    });

    it('should handle URLs with ports', () => {
      expect(detectLinkType('https://localhost:8080/article')).toBe('article');
    });

    it('should handle URLs with authentication', () => {
      expect(detectLinkType('https://user:pass@example.com')).toBe('article');
    });

    it('should handle URLs with fragments', () => {
      expect(detectLinkType('https://example.com#section')).toBe('article');
    });
  });
});

describe('extractXArticleId', () => {
  describe('valid article IDs', () => {
    it('should extract article ID from X.com URLs', () => {
      expect(extractXArticleId('https://x.com/i/article/123456')).toBe('123456');
      expect(extractXArticleId('https://www.x.com/i/article/789012')).toBe('789012');
    });

    it('should extract article ID from Twitter.com URLs', () => {
      expect(extractXArticleId('https://twitter.com/i/article/345678')).toBe('345678');
      expect(extractXArticleId('https://www.twitter.com/i/article/901234')).toBe('901234');
    });

    it('should extract article ID with additional path components', () => {
      expect(extractXArticleId('https://x.com/i/article/123456?param=value')).toBe('123456');
      expect(extractXArticleId('https://x.com/i/article/123456#section')).toBe('123456');
    });
  });

  describe('non-article URLs', () => {
    it('should return null for non-article URLs', () => {
      expect(extractXArticleId('https://x.com/user/status/123456')).toBeNull();
      expect(extractXArticleId('https://example.com/article')).toBeNull();
      expect(extractXArticleId('https://github.com/user/repo')).toBeNull();
    });

    it('should return null for malformed article URLs', () => {
      expect(extractXArticleId('https://x.com/i/article/')).toBeNull();
      expect(extractXArticleId('https://x.com/i/article/abc')).toBeNull();
      expect(extractXArticleId('https://x.com/i/articles/123456')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(extractXArticleId('')).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle multiple numeric segments', () => {
      // Should extract the first article ID found
      expect(extractXArticleId('https://x.com/i/article/123456/article/789012')).toBe('123456');
    });

    it('should be case-sensitive for path', () => {
      expect(extractXArticleId('https://x.com/I/ARTICLE/123456')).toBeNull();
    });

    it('should handle URLs with query parameters and fragments', () => {
      expect(extractXArticleId('https://x.com/i/article/123456?ref=home#section')).toBe('123456');
    });
  });
});

describe('integration tests', () => {
  it('should correctly classify and extract from X article URLs', () => {
    const url = 'https://x.com/i/article/123456';
    const type = detectLinkType(url);
    const articleId = extractXArticleId(url);

    expect(type).toBe('x-article');
    expect(articleId).toBe('123456');
  });

  it('should distinguish between tweets and articles', () => {
    const tweetUrl = 'https://x.com/user/status/123456';
    const articleUrl = 'https://x.com/i/article/123456';

    expect(detectLinkType(tweetUrl)).toBe('tweet');
    expect(detectLinkType(articleUrl)).toBe('x-article');
    expect(extractXArticleId(tweetUrl)).toBeNull();
    expect(extractXArticleId(articleUrl)).toBe('123456');
  });

  it('should distinguish between media and images', () => {
    const mediaUrl = 'https://x.com/user/status/123/photo/1';
    const imageUrl = 'https://example.com/photo.jpg';

    expect(detectLinkType(mediaUrl)).toBe('media');
    expect(detectLinkType(imageUrl)).toBe('image');
    expect(extractXArticleId(mediaUrl)).toBeNull();
    expect(extractXArticleId(imageUrl)).toBeNull();
  });
});

describe('type safety', () => {
  it('should return valid LinkType values', () => {
    const validTypes: LinkType[] = ['github', 'video', 'x-article', 'media', 'tweet', 'image', 'article'];

    const urls: string[] = [
      'https://github.com/user/repo',
      'https://youtube.com/watch?v=abc',
      'https://x.com/i/article/123',
      'https://x.com/user/status/456/photo/1',
      'https://x.com/user/status/789',
      'https://example.com/img.png',
      'https://example.com/article',
    ];

    for (const url of urls) {
      const type = detectLinkType(url);
      expect(validTypes).toContain(type);
    }
  });
});
