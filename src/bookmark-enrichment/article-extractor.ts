/**
 * Full article content extraction using Readability and Turndown
 */

import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import type { Node as TurndownNode } from 'turndown';
import TurndownService from 'turndown';

export interface ArticleContent {
    title: string;
    byline?: string;
    content: string;
    textContent: string;
    length: number;
    excerpt?: string;
    siteName?: string;
    publishedTime?: string;
}

export interface ArticleExtractionConfig {
    timeout?: number;
    userAgent?: string;
    maxLength?: number;
}

export class ArticleExtractor {
    private config: Required<ArticleExtractionConfig>;
    private turndown: TurndownService;

    constructor(config: Partial<ArticleExtractionConfig> = {}) {
        this.config = {
            timeout: config.timeout ?? 10000,
            userAgent: config.userAgent ?? 'xKit/1.0 (Article Extraction)',
            maxLength: config.maxLength ?? parseInt(process.env.XKIT_MAX_ARTICLE_LENGTH ?? '50000', 10),
        };

        // Configure Turndown for clean markdown conversion
        this.turndown = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            emDelimiter: '_',
        });

        // Add custom rules for better markdown
        this.configureTurndown();
    }

    /**
     * Extract full article content from URL
     */
    async extract(url: string): Promise<ArticleContent | null> {
        try {
            const html = await this.fetchHtml(url);
            if (!html) {
                return null;
            }

            return this.extractFromHtml(html, url);
        } catch (error) {
            console.error(`Failed to extract article from ${url}:`, error);
            return null;
        }
    }

    /**
     * Extract article content from HTML string
     */
    extractFromHtml(html: string, url: string): ArticleContent | null {
        try {
            // Parse HTML using linkedom (DOM implementation for Node.js)
            const { document } = parseHTML(html);

            // Use Readability to extract clean content
            const reader = new Readability(document, {
                keepClasses: false,
                disableJSONLD: false,
            });

            const article = reader.parse();

            if (!article) {
                return null;
            }

            // Convert HTML content to Markdown
            const markdown = this.turndown.turndown(article.content);

            // Truncate if too long
            const truncated = markdown.length > this.config.maxLength;
            const content = truncated ? `${markdown.slice(0, this.config.maxLength)}\n\n... (truncated)` : markdown;

            return {
                title: article.title || 'Untitled',
                byline: article.byline ?? undefined,
                content,
                textContent: article.textContent || '',
                length: article.length || 0,
                excerpt: article.excerpt ?? undefined,
                siteName: article.siteName ?? undefined,
                publishedTime: this.extractPublishedTime(html),
            };
        } catch (error) {
            console.error('Failed to parse article HTML:', error);
            return null;
        }
    }

    /**
     * Fetch HTML from URL
     */
    private async fetchHtml(url: string): Promise<string | null> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            const response = await fetch(url, {
                headers: {
                    'User-Agent': this.config.userAgent,
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.error(`HTTP ${response.status} for ${url}`);
                return null;
            }

            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('text/html')) {
                console.error(`Non-HTML content type: ${contentType}`);
                return null;
            }

            return await response.text();
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                console.error(`Timeout fetching ${url}`);
            } else {
                console.error(`Failed to fetch ${url}:`, error);
            }
            return null;
        }
    }

    /**
     * Extract published time from HTML meta tags
     */
    private extractPublishedTime(html: string): string | undefined {
        const patterns = [
            /<meta[^>]*property=["']article:published_time["'][^>]*content=["']([^"']*)["']/i,
            /<meta[^>]*name=["']datePublished["'][^>]*content=["']([^"']*)["']/i,
            /<meta[^>]*property=["']og:published_time["'][^>]*content=["']([^"']*)["']/i,
            /<time[^>]*datetime=["']([^"']*)["']/i,
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match?.[1]) {
                return match[1];
            }
        }

        return undefined;
    }

    /**
     * Configure Turndown with custom rules
     */
    private configureTurndown(): void {
        // Preserve code blocks
        this.turndown.addRule('codeBlock', {
            filter: ['pre'],
            replacement: (content: string, node: TurndownNode) => {
                const element = node as unknown as { querySelector: (selector: string) => { className: string } | null };
                const codeElement = element.querySelector('code');
                const language = codeElement?.className.match(/language-(\w+)/)?.[1] || '';
                return `\n\n\`\`\`${language}\n${content}\n\`\`\`\n\n`;
            },
        });

        // Better handling of inline code
        this.turndown.addRule('inlineCode', {
            filter: ['code'],
            replacement: (content: string) => {
                if (!content.trim()) {
                    return '';
                }
                return `\`${content}\``;
            },
        });

        // Preserve images with alt text
        this.turndown.addRule('images', {
            filter: 'img',
            replacement: (_content: string, node: TurndownNode) => {
                const element = node as unknown as { getAttribute: (attr: string) => string | null };
                const alt = element.getAttribute('alt') || '';
                const src = element.getAttribute('src') || '';
                const title = element.getAttribute('title');

                if (!src) {
                    return '';
                }

                return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
            },
        });

        // Better blockquote handling
        this.turndown.addRule('blockquote', {
            filter: 'blockquote',
            replacement: (content: string) => {
                const lines = content.trim().split('\n');
                return `\n\n${lines.map((line: string) => `> ${line}`).join('\n')}\n\n`;
            },
        });

        // Remove script and style tags
        this.turndown.remove(['script', 'style', 'noscript', 'iframe']);
    }

    /**
     * Estimate reading time from text content
     */
    static estimateReadingTime(textContent: string): number {
        const wordsPerMinute = 200;
        const wordCount = textContent.split(/\s+/).length;
        return Math.ceil(wordCount / wordsPerMinute);
    }

    /**
     * Get word count from text content
     */
    static getWordCount(textContent: string): number {
        return textContent.split(/\s+/).filter((word) => word.length > 0).length;
    }
}
