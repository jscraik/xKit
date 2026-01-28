/**
 * Link type detector utility for content extraction.
 * Provides URL classification and X/Twitter article ID extraction.
 */

const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const X_ARTICLE_ID_REGEX = /\/i\/article\/(\d+)/;

export type LinkType = 'github' | 'video' | 'x-article' | 'media' | 'tweet' | 'image' | 'article';

/**
 * Detects the type of link based on URL patterns.
 *
 * @param url - The URL to analyze
 * @returns The detected link type
 * @throws {Error} If the URL protocol is not http or https
 *
 * @example
 * ```ts
 * detectLinkType('https://github.com/user/repo') // 'github'
 * detectLinkType('https://youtube.com/watch?v=xxx') // 'video'
 * detectLinkType('https://x.com/i/article/12345') // 'x-article'
 * ```
 */
export function detectLinkType(url: string): LinkType {
  const parsed = new URL(url);

  // Security: Only allow http/https protocols
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`Invalid URL protocol: ${parsed.protocol}`);
  }

  const lower = url.toLowerCase();

  // X/Twitter internal articles (highest priority as they're specific)
  if (lower.includes('/i/article/')) {
    return 'x-article';
  }

  // GitHub repositories and issues
  if (lower.includes('github.com')) {
    return 'github';
  }

  // Video platforms (YouTube)
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return 'video';
  }

  // X/Twitter media (photo/video)
  if (lower.includes('/photo/') || lower.includes('/video/')) {
    return 'media';
  }

  // X/Twitter tweets
  if (lower.includes('x.com') || lower.includes('twitter.com')) {
    return 'tweet';
  }

  // Direct image URLs
  if (IMAGE_EXTENSION_REGEX.test(url)) {
    return 'image';
  }

  // Default: general article
  return 'article';
}

/**
 * Extracts the article ID from an X/Twitter article URL.
 *
 * @param url - The X/Twitter article URL
 * @returns The article ID, or null if not found
 *
 * @example
 * ```ts
 * extractXArticleId('https://x.com/i/article/123456') // '123456'
 * extractXArticleId('https://example.com') // null
 * ```
 */
export function extractXArticleId(url: string): string | null {
  const match = url.match(X_ARTICLE_ID_REGEX);
  return match ? match[1] : null;
}
