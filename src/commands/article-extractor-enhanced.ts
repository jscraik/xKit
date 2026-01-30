/**
 * Enhanced article extraction with retry logic and better error handling
 */

import { ArticleExtractor } from '../bookmark-enrichment/article-extractor.js';
import { UrlExpander } from '../bookmark-enrichment/url-expander.js';
import { detectLinkType } from '../content-extraction/link-detector.js';
import type { TweetData } from '../lib/twitter-client-types.js';
import type { ErrorLogger } from './shared/error-logger.js';
import { retryWithBackoff } from './shared/retry-utils.js';

export interface EnhancedArticleItem {
    url: string;
    originalUrl?: string;
    title?: string;
    content?: string;
    publishedTime?: string;
    author?: string;
    description?: string;
    tags?: string[];
    tweetId: string;
    tweetText: string;
    tweetUrl: string;
    tweetDate?: string;
    extractedAt: string;
}

export interface ArticleExtractionOptions {
    batchSize?: number;
    maxRetries?: number;
    errorLogger?: ErrorLogger;
    onProgress?: (current: number, total: number) => void;
}

/**
 * Extract articles from tweets with enhanced metadata and error handling
 */
export async function extractArticlesEnhanced(
    tweets: TweetData[],
    options: ArticleExtractionOptions = {}
): Promise<EnhancedArticleItem[]> {
    const { batchSize = 5, maxRetries = 3, errorLogger, onProgress } = options;

    const urlExpander = new UrlExpander();
    const articleExtractor = new ArticleExtractor();
    const articles: EnhancedArticleItem[] = [];

    // Collect all article URLs from tweets
    const urlsToProcess: Array<{
        url: string;
        tweet: TweetData;
    }> = [];

    const urlRegex = /https?:\/\/[^\s]+/g;

    for (const tweet of tweets) {
        if (!tweet.text) continue;

        const urls = tweet.text.match(urlRegex);
        if (!urls) continue;

        for (const url of urls) {
            try {
                const linkType = detectLinkType(url);
                if (linkType === 'article') {
                    urlsToProcess.push({ url, tweet });
                }
            } catch (error) {
                if (errorLogger) {
                    errorLogger.log('link-detection', (error as Error).message, url);
                }
            }
        }
    }

    let processed = 0;

    // Process in batches
    for (let i = 0; i < urlsToProcess.length; i += batchSize) {
        const batch = urlsToProcess.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
            batch.map(async ({ url, tweet }) => {
                return retryWithBackoff(
                    async () => {
                        const expanded = await urlExpander.expand(url);
                        const content = await articleExtractor.extract(expanded.finalUrl);

                        if (!content || !content.title) {
                            throw new Error('No content extracted');
                        }

                        const article: EnhancedArticleItem = {
                            url: expanded.finalUrl,
                            originalUrl: url,
                            title: content.title,
                            content: content.content,
                            publishedTime: content.publishedTime,
                            // These fields may not be available in ArticleContent type
                            author: undefined,
                            description: undefined,
                            tags: undefined,
                            tweetId: tweet.id,
                            tweetText: tweet.text || '',
                            tweetUrl: `https://x.com/${tweet.author?.username || 'unknown'}/status/${tweet.id}`,
                            tweetDate: tweet.createdAt,
                            extractedAt: new Date().toISOString(),
                        };

                        return article;
                    },
                    {
                        maxRetries,
                        onRetry: (attempt, error) => {
                            if (errorLogger) {
                                errorLogger.log('article-extraction-retry', `Attempt ${attempt}: ${error.message}`, url);
                            }
                        },
                    }
                );
            })
        );

        for (const result of batchResults) {
            processed++;

            if (result.status === 'fulfilled') {
                articles.push(result.value);
            } else if (errorLogger) {
                const failedItem = batch[batchResults.indexOf(result)];
                errorLogger.log('article-extraction-failed', result.reason.message, failedItem.url);
            }

            if (onProgress) {
                onProgress(processed, urlsToProcess.length);
            }
        }
    }

    return articles;
}
