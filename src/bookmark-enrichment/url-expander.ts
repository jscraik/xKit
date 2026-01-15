/**
 * URL expansion and redirect following
 */

import type { ExpandedUrl } from './types.js';

export class UrlExpander {
  private maxRedirects: number;
  private timeout: number;
  private userAgent: string;

  constructor(
    options: {
      maxRedirects?: number;
      timeout?: number;
      userAgent?: string;
    } = {},
  ) {
    this.maxRedirects = options.maxRedirects ?? 10;
    this.timeout = options.timeout ?? 5000;
    this.userAgent = options.userAgent ?? 'xKit/1.0 (Bookmark Enrichment)';
  }

  /**
   * Expand a URL by following redirects
   */
  async expand(url: string): Promise<ExpandedUrl> {
    const redirectChain: string[] = [url];
    let currentUrl = url;
    let redirectCount = 0;

    try {
      while (redirectCount < this.maxRedirects) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
          const response = await fetch(currentUrl, {
            method: 'HEAD',
            redirect: 'manual',
            headers: {
              'User-Agent': this.userAgent,
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Check for redirect
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
              break;
            }

            // Handle relative URLs
            const nextUrl = new URL(location, currentUrl).href;
            redirectChain.push(nextUrl);
            currentUrl = nextUrl;
            redirectCount++;
          } else {
            // No more redirects
            break;
          }
        } catch (error) {
          clearTimeout(timeoutId);
          if (error instanceof Error && error.name === 'AbortError') {
            // Timeout - use current URL as final
            break;
          }
          throw error;
        }
      }

      return {
        original: url,
        expanded: redirectChain.length > 1 ? redirectChain[1] : url,
        finalUrl: currentUrl,
        redirectChain,
      };
    } catch (_error) {
      // On error, return original URL
      return {
        original: url,
        expanded: url,
        finalUrl: url,
        redirectChain: [url],
      };
    }
  }

  /**
   * Extract URLs from tweet text
   */
  extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Expand all t.co URLs in tweet text
   */
  async expandTcoUrls(text: string): Promise<Map<string, ExpandedUrl>> {
    const urls = this.extractUrls(text);
    const tcoUrls = urls.filter((url) => url.includes('t.co'));

    const expansions = new Map<string, ExpandedUrl>();

    await Promise.all(
      tcoUrls.map(async (url) => {
        const expanded = await this.expand(url);
        expansions.set(url, expanded);
      }),
    );

    return expansions;
  }
}
