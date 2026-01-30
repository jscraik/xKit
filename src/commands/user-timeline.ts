import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { normalizeHandle } from '../lib/normalize-handle.js';
import { TwitterClient } from '../lib/twitter-client.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorLogger, ProgressTracker } from './shared/index.js';
import { extractArticlesEnhanced } from './article-extractor-enhanced.js';

interface UserTimelineOptions {
    count?: string;
    json?: boolean;
    jsonFull?: boolean;
    // Filter options
    minLikes?: string;
    excludeRetweets?: boolean;
    excludeReplies?: boolean;
    dateFrom?: string;
    dateTo?: string;
    mediaOnly?: boolean;
    // Content extraction
    extractArticles?: boolean;
    extractCode?: boolean;
    includeThreads?: boolean;
    // Export options
    exportMarkdown?: boolean;
    exportCsv?: boolean;
    outputDir?: string;
    // Ollama options for extraction
    ollamaModel?: string;
    ollamaHost?: string;
}

/**
 * Calculate timeline statistics
 */
function calculateTimelineStatistics(tweets: any[]) {
    // Infer isRetweet from text content (starts with "RT @")
    // Infer isReply from inReplyToStatusId presence
    const stats = {
        totalTweets: tweets.length,
        totalLikes: tweets.reduce((sum, t) => sum + (t.likeCount || 0), 0),
        totalRetweets: tweets.reduce((sum, t) => sum + (t.retweetCount || 0), 0),
        totalReplies: tweets.reduce((sum, t) => sum + (t.replyCount || 0), 0),
        averageLikes: 0,
        retweetCount: tweets.filter(t => t.text?.startsWith('RT @')).length,
        replyCount: tweets.filter(t => t.inReplyToStatusId).length,
        mediaCount: tweets.filter(t => t.media && t.media.length > 0).length,
    };
    stats.averageLikes = stats.totalTweets > 0 ? Math.round(stats.totalLikes / stats.totalTweets) : 0;
    return stats;
}

/**
 * Generate markdown from tweets
 */
function generateTimelineMarkdown(tweets: any[], stats: any, username: string): string {
    let markdown = `# Timeline: @${username}\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
    markdown += `## Statistics\n\n`;
    markdown += `- Total tweets: ${stats.totalTweets}\n`;
    markdown += `- Total likes: ${stats.totalLikes}\n`;
    markdown += `- Average likes: ${stats.averageLikes}\n`;
    markdown += `- Retweets: ${stats.retweetCount}\n`;
    markdown += `- Replies: ${stats.replyCount}\n`;
    markdown += `- With media: ${stats.mediaCount}\n\n`;
    markdown += `## Tweets\n\n`;

    for (const tweet of tweets) {
        const date = new Date(tweet.createdAt || '').toLocaleString();
        markdown += `### [${date}] (@${username})\n\n`;
        markdown += `${tweet.text}\n\n`;
        markdown += `**Likes:** ${tweet.likeCount || 0} | `;
        markdown += `**Retweets:** ${tweet.retweetCount || 0} | `;
        markdown += `**Replies:** ${tweet.replyCount || 0}\n\n`;
        if (tweet.media && tweet.media.length > 0) {
            markdown += `**Media:** ${tweet.media.length} item(s)\n\n`;
        }
        if (tweet.url) {
            markdown += `**Link:** ${tweet.url}\n\n`;
        }
        markdown += `---\n\n`;
    }

    return markdown;
}

/**
 * Generate CSV from tweets
 */
function generateTimelineCsv(tweets: any[]): string {
    const headers = ['date', 'text', 'likes', 'retweets', 'replies', 'isRetweet', 'isReply', 'url', 'mediaCount'];
    let csv = headers.join(',') + '\n';

    for (const tweet of tweets) {
        const date = new Date(tweet.createdAt || '').toISOString();
        const text = `"${(tweet.text || '').replace(/"/g, '""')}"`;
        const likes = tweet.likeCount || 0;
        const retweets = tweet.retweetCount || 0;
        const replies = tweet.replyCount || 0;
        const isRetweet = tweet.text?.startsWith('RT @') ? 'true' : 'false';
        const isReply = tweet.inReplyToStatusId ? 'true' : 'false';
        const url = tweet.url || '';
        const mediaCount = tweet.media ? tweet.media.length : 0;

        csv += `${date},${text},${likes},${retweets},${replies},${isRetweet},${isReply},${url},${mediaCount}\n`;
    }

    return csv;
}

/**
 * Register user timeline command.
 *
 * @param program Commander program instance.
 * @param ctx CLI context for shared helpers.
 */
export function registerUserTimelineCommand(program: Command, ctx: CliContext): void {
    program
        .command('user-timeline')
        .alias('ut')
        .description('Get tweets from a specific user with filtering and export options')
        .argument('<username>', 'Username (e.g., @jh3yy or jh3yy)')
        .option('-n, --count <number>', 'Number of tweets to fetch', '20')
        .option('--json', 'Output as JSON')
        .option('--json-full', 'Output as JSON with full raw API response in _raw field')
        // Filter options
        .option('--min-likes <number>', 'Only include tweets with at least this many likes')
        .option('--exclude-retweets', 'Exclude retweets')
        .option('--exclude-replies', 'Exclude replies')
        .option('--date-from <date>', 'Only include tweets from this date onwards (YYYY-MM-DD)')
        .option('--date-to <date>', 'Only include tweets up to this date (YYYY-MM-DD)')
        .option('--media-only', 'Only include tweets with media')
        // Content extraction options
        .option('--extract-articles', 'Extract full article content from links')
        .option('--extract-code', 'Extract code snippets from tweets')
        .option('--include-threads', 'Fetch full threads for each tweet')
        // Export options
        .option('--export-markdown', 'Export timeline to markdown')
        .option('--export-csv', 'Export timeline to CSV')
        .option('--output-dir <path>', 'Output directory for exports', './output')
        // Ollama options for extraction
        .option('--ollama-model <name>', 'Ollama model to use for extraction', 'qwen2.5:7b')
        .option('--ollama-host <url>', 'Ollama host URL', 'http://localhost:11434')
        .action(async (username: string, cmdOpts: UserTimelineOptions) => {
            const opts = program.opts();
            const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
            const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);

            const countResult = ctx.parseIntegerOption(cmdOpts.count, { name: '--count', min: 1 });
            if (!countResult.ok) {
                console.error(`${ctx.p('err')}${countResult.error}`);
                process.exit(2);
            }
            const count = countResult.value;

            // Normalize username (remove @ if present)
            const normalizedUsername = normalizeHandle(username);
            if (!normalizedUsername) {
                console.error(`${ctx.p('err')}Invalid username: ${username}`);
                process.exit(2);
            }

            const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

            for (const warning of warnings) {
                console.error(`${ctx.p('warn')}${warning}`);
            }

            if (!cookies.authToken || !cookies.ct0) {
                console.error(`${ctx.p('err')}Missing required credentials`);
                process.exit(1);
            }

            const client = new TwitterClient({ cookies, timeoutMs, quoteDepth });
            const includeRaw = cmdOpts.jsonFull ?? false;
            const result = await client.getUserTweets(normalizedUsername, count, { includeRaw });

            if (!result.success || !result.tweets) {
                console.error(`${ctx.p('err')}Failed to fetch user timeline: ${result.error}`);
                process.exit(1);
            }

            let tweets = result.tweets;
            console.log(`✅ Fetched ${tweets.length} tweets from @${normalizedUsername}`);

            // Initialize error logger if export options are used
            let errorLogger: ErrorLogger | undefined;
            if (cmdOpts.exportMarkdown || cmdOpts.exportCsv) {
                errorLogger = new ErrorLogger(cmdOpts.outputDir || './output');
            }

            // Apply filters
            if (cmdOpts.minLikes) {
                const minLikesResult = ctx.parseIntegerOption(cmdOpts.minLikes, { name: '--min-likes', min: 0 });
                if (minLikesResult.ok) {
                    const before = tweets.length;
                    tweets = tweets.filter(t => (t.likeCount || 0) >= minLikesResult.value);
                    console.log(`🔍 Filtered by min likes (${minLikesResult.value}): ${before - tweets.length} removed`);
                }
            }

            if (cmdOpts.excludeRetweets) {
                const before = tweets.length;
                tweets = tweets.filter(t => !t.text?.startsWith('RT @'));
                console.log(`🔍 Excluded ${before - tweets.length} retweets`);
            }

            if (cmdOpts.excludeReplies) {
                const before = tweets.length;
                tweets = tweets.filter(t => !t.inReplyToStatusId);
                console.log(`🔍 Excluded ${before - tweets.length} replies`);
            }

            if (cmdOpts.mediaOnly) {
                const before = tweets.length;
                tweets = tweets.filter(t => t.media && t.media.length > 0);
                console.log(`🔍 Filtered to ${tweets.length} tweets with media (${before - tweets.length} removed)`);
            }

            if (cmdOpts.dateFrom) {
                const fromDate = new Date(cmdOpts.dateFrom);
                if (!isNaN(fromDate.getTime())) {
                    const before = tweets.length;
                    tweets = tweets.filter(t => {
                        const tweetDate = new Date(t.createdAt || '');
                        return tweetDate >= fromDate;
                    });
                    console.log(`🔍 Filtered by date from (${cmdOpts.dateFrom}): ${before - tweets.length} removed`);
                } else {
                    console.warn(`${ctx.p('warn')}Invalid date-from format. Use YYYY-MM-DD`);
                }
            }

            if (cmdOpts.dateTo) {
                const toDate = new Date(cmdOpts.dateTo);
                if (!isNaN(toDate.getTime())) {
                    const before = tweets.length;
                    tweets = tweets.filter(t => {
                        const tweetDate = new Date(t.createdAt || '');
                        return tweetDate <= toDate;
                    });
                    console.log(`🔍 Filtered by date to (${cmdOpts.dateTo}): ${before - tweets.length} removed`);
                } else {
                    console.warn(`${ctx.p('warn')}Invalid date-to format. Use YYYY-MM-DD`);
                }
            }

            // Content extraction
            if (cmdOpts.extractArticles && tweets.length > 0) {
                console.log('\n📰 Extracting articles...');
                const progress = new ProgressTracker(tweets.length, 'Extracting');

                try {
                    const articles = await extractArticlesEnhanced(tweets, {
                        batchSize: 5,
                        maxRetries: 3,
                        errorLogger,
                        onProgress: (current, total) => {
                            progress.increment();
                        },
                    });

                    progress.complete();
                    console.log(`✅ Extracted ${articles.filter(a => a.content).length} articles`);
                } catch (error) {
                    console.warn(`${ctx.p('warn')}Article extraction failed: ${error}`);
                    if (errorLogger) {
                        errorLogger.log('article-extraction', error instanceof Error ? error.message : String(error));
                    }
                }
            }

            // Calculate and display statistics
            const stats = calculateTimelineStatistics(tweets);
            console.log('\n📊 Timeline Statistics:');
            console.log(`   Total tweets: ${stats.totalTweets}`);
            console.log(`   Total likes: ${stats.totalLikes}`);
            console.log(`   Average likes: ${stats.averageLikes}`);
            console.log(`   Retweets: ${stats.retweetCount} (${Math.round((stats.retweetCount / stats.totalTweets) * 100)}%)`);
            console.log(`   Replies: ${stats.replyCount} (${Math.round((stats.replyCount / stats.totalTweets) * 100)}%)`);
            console.log(`   With media: ${stats.mediaCount} (${Math.round((stats.mediaCount / stats.totalTweets) * 100)}%)`);

            // Export if requested
            if (cmdOpts.exportMarkdown) {
                const markdown = generateTimelineMarkdown(tweets, stats, normalizedUsername);
                const outputPath = join(cmdOpts.outputDir!, `${normalizedUsername}-timeline.md`);
                writeFileSync(outputPath, markdown, 'utf8');
                console.log(`\n📄 Exported markdown to ${outputPath}`);
            }

            if (cmdOpts.exportCsv) {
                const csv = generateTimelineCsv(tweets);
                const outputPath = join(cmdOpts.outputDir!, `${normalizedUsername}-timeline.csv`);
                writeFileSync(outputPath, csv, 'utf8');
                console.log(`📄 Exported CSV to ${outputPath}`);
            }

            // Save error log if there were errors
            if (errorLogger && errorLogger.getCount() > 0) {
                errorLogger.save();
                console.log(`\n⚠️  Logged ${errorLogger.getCount()} errors to ${cmdOpts.outputDir}/errors.log`);
            }

            // Print tweets (unless export only)
            if (!cmdOpts.exportMarkdown && !cmdOpts.exportCsv) {
                ctx.printTweets(tweets, {
                    json: cmdOpts.json || cmdOpts.jsonFull,
                    emptyMessage: `No tweets found for @${normalizedUsername}.`,
                });
            } else {
                console.log(`\n✨ Done!`);
            }
        });
}
