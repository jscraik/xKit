/**
 * Content extraction from linked pages
 */

import { ArticleExtractor } from './article-extractor.js';
import { OllamaClient } from './ollama-client.js';
import type { LinkedContent } from './types.js';

export class ContentExtractor {
  private timeout: number;
  private userAgent: string;
  private articleExtractor: ArticleExtractor;
  private ollamaClient: OllamaClient | null;
  private enableFullContent: boolean;
  private enableSummarization: boolean;

  constructor(
    options: {
      timeout?: number;
      userAgent?: string;
      enableFullContent?: boolean;
      enableSummarization?: boolean;
      ollamaModel?: string;
    } = {},
  ) {
    this.timeout = options.timeout ?? 10000;
    this.userAgent = options.userAgent ?? 'xKit/1.0 (Bookmark Enrichment)';
    this.enableFullContent = options.enableFullContent ?? (process.env.XKIT_EXTRACT_FULL_CONTENT !== 'false');
    this.enableSummarization = options.enableSummarization ?? false;

    this.articleExtractor = new ArticleExtractor({
      timeout: this.timeout,
      userAgent: this.userAgent,
    });

    // Initialize Ollama client if summarization is enabled
    this.ollamaClient = this.enableSummarization
      ? new OllamaClient({
        model: options.ollamaModel,
      })
      : null;
  }

  /**
   * Extract content from a URL
   */
  async extract(url: string): Promise<LinkedContent | null> {
    try {
      const urlObj = new URL(url);

      // Route to appropriate extractor based on domain
      if (urlObj.hostname.includes('github.com')) {
        return await this.extractGitHub(url);
      }

      if (this.isArticleDomain(urlObj.hostname)) {
        return await this.extractArticle(url);
      }

      if (this.isVideoDomain(urlObj.hostname)) {
        return await this.extractVideo(url);
      }

      // Generic extraction
      return await this.extractGeneric(url);
    } catch (error) {
      console.error(`Failed to extract content from ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract GitHub repository information
   */
  private async extractGitHub(url: string): Promise<LinkedContent> {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      return { type: 'github' };
    }

    const owner = pathParts[0];
    const repo = pathParts[1];

    try {
      // Fetch repository info from GitHub API
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/vnd.github.v3+json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { type: 'github', title: `${owner}/${repo}` };
      }

      const data = (await response.json()) as {
        name: string;
        description: string;
        stargazers_count: number;
        language: string;
        topics: string[];
        owner: { login: string };
      };

      // Fetch README
      let readme: string | undefined;
      try {
        const readmeUrl = `https://api.github.com/repos/${owner}/${repo}/readme`;
        const readmeResponse = await fetch(readmeUrl, {
          headers: {
            'User-Agent': this.userAgent,
            Accept: 'application/vnd.github.v3.raw',
          },
        });

        if (readmeResponse.ok) {
          readme = await readmeResponse.text();
          // Truncate if too long
          if (readme.length > 5000) {
            readme = `${readme.slice(0, 5000)}\n\n... (truncated)`;
          }
        }
      } catch {
        // README fetch failed, continue without it
      }

      return {
        type: 'github',
        title: data.name,
        description: data.description,
        author: data.owner.login,
        stars: data.stargazers_count,
        language: data.language,
        topics: data.topics,
        readme,
      };
    } catch (_error) {
      return {
        type: 'github',
        title: `${owner}/${repo}`,
      };
    }
  }

  /**
   * Extract article content
   */
  private async extractArticle(url: string): Promise<LinkedContent> {
    try {
      // Try full content extraction if enabled
      if (this.enableFullContent) {
        const article = await this.articleExtractor.extract(url);

        if (article) {
          const result: LinkedContent = {
            type: 'article',
            title: article.title,
            author: article.byline,
            description: article.excerpt,
            publishedDate: article.publishedTime,
            excerpt: article.excerpt,
            wordCount: ArticleExtractor.getWordCount(article.textContent),
            readingTime: ArticleExtractor.estimateReadingTime(article.textContent),
            fullContent: article.content,
            textContent: article.textContent,
            contentLength: article.length,
            siteName: article.siteName,
          };

          // Add AI summarization if enabled
          if (this.enableSummarization && this.ollamaClient) {
            try {
              const ollamaAvailable = await this.ollamaClient.isAvailable();

              if (ollamaAvailable) {
                const summaryResult = await this.ollamaClient.summarizeArticle(
                  article.textContent.slice(0, 8000),
                  article.title,
                );

                result.summary = summaryResult.summary;
                result.keyPoints = summaryResult.keyPoints;
                result.aiGenerated = true;
                result.aiModel = summaryResult.model;
              }
            } catch (error) {
              console.error('Failed to generate AI summary:', error);
              // Continue without summary
            }
          }

          return result;
        }
      }

      // Fallback to basic metadata extraction
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { type: 'article' };
      }

      const html = await response.text();

      // Extract metadata from HTML
      const title = this.extractMetaTag(html, ['og:title', 'twitter:title', 'title']);
      const description = this.extractMetaTag(html, ['og:description', 'twitter:description', 'description']);
      const author = this.extractMetaTag(html, ['author', 'article:author']);
      const publishedDate = this.extractMetaTag(html, ['article:published_time', 'datePublished']);

      // Estimate reading time from content
      const textContent = this.extractTextContent(html);
      const wordCount = textContent.split(/\s+/).length;
      const readingTime = Math.ceil(wordCount / 200); // Average reading speed

      return {
        type: 'article',
        title,
        description,
        author,
        publishedDate,
        excerpt: description || textContent.slice(0, 300),
        wordCount,
        readingTime,
      };
    } catch (_error) {
      return { type: 'article' };
    }
  }

  /**
   * Extract video information
   */
  private async extractVideo(url: string): Promise<LinkedContent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { type: 'video' };
      }

      const html = await response.text();

      const title = this.extractMetaTag(html, ['og:title', 'twitter:title', 'title']);
      const description = this.extractMetaTag(html, ['og:description', 'twitter:description', 'description']);
      const author = this.extractMetaTag(html, ['author', 'video:author']);
      const durationStr = this.extractMetaTag(html, ['video:duration', 'duration']);
      const duration = durationStr ? parseInt(durationStr, 10) : undefined;

      return {
        type: 'video',
        title,
        description,
        author,
        duration,
      };
    } catch (_error) {
      return { type: 'video' };
    }
  }

  /**
   * Generic content extraction
   */
  private async extractGeneric(url: string): Promise<LinkedContent> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { type: 'unknown' };
      }

      const html = await response.text();

      const title = this.extractMetaTag(html, ['og:title', 'twitter:title', 'title']);
      const description = this.extractMetaTag(html, ['og:description', 'twitter:description', 'description']);

      return {
        type: 'unknown',
        title,
        description,
      };
    } catch (_error) {
      return { type: 'unknown' };
    }
  }

  /**
   * Extract meta tag content from HTML
   */
  private extractMetaTag(html: string, names: string[]): string | undefined {
    for (const name of names) {
      // Try meta property
      const propertyRegex = new RegExp(`<meta[^>]*property=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
      const propertyMatch = html.match(propertyRegex);
      if (propertyMatch) {
        return this.decodeHtmlEntities(propertyMatch[1]);
      }

      // Try meta name
      const nameRegex = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["']`, 'i');
      const nameMatch = html.match(nameRegex);
      if (nameMatch) {
        return this.decodeHtmlEntities(nameMatch[1]);
      }

      // Try title tag
      if (name === 'title') {
        const titleRegex = /<title[^>]*>([^<]*)<\/title>/i;
        const titleMatch = html.match(titleRegex);
        if (titleMatch) {
          return this.decodeHtmlEntities(titleMatch[1]);
        }
      }
    }

    return undefined;
  }

  /**
   * Extract text content from HTML (simple version)
   */
  private extractTextContent(html: string): string {
    // Remove script and style tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    // Remove HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = this.decodeHtmlEntities(text);

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Decode HTML entities
   */
  private decodeHtmlEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&apos;': "'",
    };

    return text.replace(/&[^;]+;/g, (entity) => entities[entity] || entity);
  }

  /**
   * Check if domain is an article site
   */
  private isArticleDomain(hostname: string): boolean {
    const articleDomains = [
      'medium.com',
      'substack.com',
      'dev.to',
      'hashnode.dev',
      'blog.',
      'news.',
      'article.',
      'post.',
    ];

    return articleDomains.some((domain) => hostname.includes(domain));
  }

  /**
   * Check if domain is a video site
   */
  private isVideoDomain(hostname: string): boolean {
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv'];

    return videoDomains.some((domain) => hostname.includes(domain));
  }
}
