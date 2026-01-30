import type { Command } from 'commander';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { ArticleExtractor } from '../bookmark-enrichment/article-extractor.js';
import { UrlExpander } from '../bookmark-enrichment/url-expander.js';
import { MediaHandler } from '../bookmark-media/index.js';
import type { CliContext } from '../cli/shared.js';
import { detectLinkType } from '../content-extraction/link-detector.js';
import { normalizeHandle } from '../lib/normalize-handle.js';
import type { TweetData } from '../lib/twitter-client-types.js';
import { TwitterClient } from '../lib/twitter-client.js';
import {
    PersonaSynthesizer,
    TextAnalyzer,
    TranscriptionAnalyzer,
    VisionAnalyzer,
    type PersonaAnalysisOptions,
} from '../persona-extraction/index.js';
import { SkillWriter } from '../skill-generator/index.js';
import {
    extractArticlesEnhanced,
    type EnhancedArticleItem,
} from './article-extractor-enhanced.js';
import {
    calculateStatistics,
    extractProfileMetadata,
    type ProfileMetadata,
    type ProfileStatistics,
} from './profile-metadata.js';
import {
    CheckpointManager,
    ErrorLogger,
    ProgressTracker,
    deduplicateByKey,
} from './shared/index.js';

interface SweepOptions {
    limit?: string;
    extractArticles?: boolean;
    includeCode?: boolean;
    includeMedia?: boolean;
    includeImages?: boolean;
    includeVideos?: boolean;
    createSkill?: boolean;
    target?: string;
    model?: string;
    host?: string;
    autoApprove?: boolean;
    minLikes?: string;
    excludeRetweets?: boolean;
    dateFrom?: string;
    dateTo?: string;
    outputFormat?: string;
    resume?: boolean;
}

interface MediaItem {
    type: 'photo' | 'video' | 'animated_gif';
    url: string;
    videoUrl?: string;
    durationMs?: number;
    localPath?: string;
}

interface ArticleItem {
    url: string;
    originalUrl?: string;
    title?: string;
    content?: string;
    publishedTime?: string;
    author?: string;
    description?: string;
    tags?: string[];
    tweetId?: string;
    tweetText?: string;
    tweetUrl?: string;
    tweetDate?: string;
}

interface CodeSnippet {
    language?: string;
    code: string;
    context: string;
    type?: 'code-block' | 'inline-code' | 'component' | 'css-property' | 'code-link' | 'image-code';
    category?: string; // e.g., 'animation', 'component', 'styling', 'api'
    componentName?: string; // e.g., 'Drawer', 'Sonner', 'Vaul'
    tweetId?: string;
    tweetUrl?: string;
}

interface OrganizedCodeSnippets {
    byType: {
        codeBlocks: CodeSnippet[];
        inlineCode: CodeSnippet[];
        components: CodeSnippet[];
        cssProperties: CodeSnippet[];
        codeLinks: CodeSnippet[];
        imageCode: CodeSnippet[];
    };
    byComponent: Record<string, CodeSnippet[]>;
    byCategory: Record<string, CodeSnippet[]>;
    all: CodeSnippet[];
}

interface ProfileSweepResult {
    username: string;
    profile?: ProfileMetadata;
    statistics?: ProfileStatistics;
    tweets: TweetData[];
    media: MediaItem[];
    articles: ArticleItem[];
    codeSnippets: CodeSnippet[];
    organizedCode?: OrganizedCodeSnippets;
    archivedAt: string;
    persona?: unknown;
    errors?: {
        count: number;
        summary: Record<string, number>;
    };
}

/**
 * Register profile sweep command for comprehensive profile archiving.
 */
export function registerProfileSweepCommand(program: Command, ctx: CliContext): void {
    program
        .command('profile-sweep')
        .alias('ps')
        .description('Comprehensive profile archive with media, articles, code, and optional persona extraction')
        .argument('<username>', 'Username (e.g., @jh3yy or jh3yy)')
        .option('-n, --limit <number>', 'Number of tweets to fetch (default: 200, max: 3200)', '200')
        .option('--extract-articles', 'Extract full article content from links', false)
        .option('--include-code', 'Extract code snippets from tweets', true)
        .option('--include-media', 'Download all media (images and videos)', false)
        .option('--include-images', 'Download and analyze images', false)
        .option('--include-videos', 'Download videos', false)
        .option('--create-skill', 'Extract persona and generate Claude skill', false)
        .option('-t, --target <path>', 'Target directory for skill output', join(homedir(), 'dev', 'agent-skills', 'personas'))
        .option('--model <name>', 'Ollama model for persona extraction (default: qwen2.5:7b)', 'qwen2.5:7b')
        .option('--host <url>', 'Ollama host URL (default: http://localhost:11434)', 'http://localhost:11434')
        .option('--auto-approve', 'Write skill directly without review', false)
        .option('--min-likes <number>', 'Only include tweets with at least this many likes')
        .option('--exclude-retweets', 'Exclude retweets from the archive', false)
        .option('--date-from <date>', 'Only include tweets from this date onwards (YYYY-MM-DD)')
        .option('--date-to <date>', 'Only include tweets up to this date (YYYY-MM-DD)')
        .option('--output-format <format>', 'Additional output formats: csv, html, sqlite', 'json,markdown')
        .option('--resume', 'Resume from previous checkpoint if available', false)
        .action(async (username: string, cmdOpts: SweepOptions) => {
            const opts = program.opts();
            const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
            const quoteDepth = ctx.resolveQuoteDepthFromOptions(opts);
            const startTime = Date.now();

            console.log('🔍 xKit Profile Sweep\n');

            const countResult = ctx.parseIntegerOption(cmdOpts.limit, { name: '--limit', min: 1, max: 3200 });
            if (!countResult.ok) {
                console.error(`${ctx.p('err')}${countResult.error}`);
                process.exit(2);
            }
            const count = countResult.value;

            // Parse filter options
            let minLikes = 0;
            if (cmdOpts.minLikes) {
                const likesResult = ctx.parseIntegerOption(cmdOpts.minLikes, { name: '--min-likes', min: 0 });
                if (!likesResult.ok) {
                    console.error(`${ctx.p('err')}${likesResult.error}`);
                    process.exit(2);
                }
                minLikes = likesResult.value;
            }

            let dateFrom: Date | undefined;
            let dateTo: Date | undefined;
            if (cmdOpts.dateFrom) {
                dateFrom = new Date(cmdOpts.dateFrom);
                if (isNaN(dateFrom.getTime())) {
                    console.error(`${ctx.p('err')}Invalid date format for --date-from. Use YYYY-MM-DD`);
                    process.exit(2);
                }
            }
            if (cmdOpts.dateTo) {
                dateTo = new Date(cmdOpts.dateTo);
                if (isNaN(dateTo.getTime())) {
                    console.error(`${ctx.p('err')}Invalid date format for --date-to. Use YYYY-MM-DD`);
                    process.exit(2);
                }
            }

            const normalizedUsername = normalizeHandle(username);
            if (!normalizedUsername) {
                console.error(`${ctx.p('err')}Invalid username: ${username}`);
                process.exit(2);
            }

            // Create artifacts directory
            const artifactsDir = join(process.cwd(), 'artifacts', normalizedUsername);
            mkdirSync(artifactsDir, { recursive: true });

            // Initialize utilities
            const errorLogger = new ErrorLogger(artifactsDir);
            const checkpointManager = new CheckpointManager(artifactsDir, normalizedUsername);

            // Check for resume
            let checkpoint = null;
            if (cmdOpts.resume) {
                checkpoint = checkpointManager.load();
                if (checkpoint) {
                    console.log(`📍 Resuming from checkpoint (${checkpoint.tweetsProcessed} tweets processed)`);
                }
            }

            console.log(`📱 Authenticating...`);
            const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

            for (const warning of warnings) {
                console.error(`${ctx.p('warn')}${warning}`);
            }

            if (!cookies.authToken || !cookies.ct0) {
                console.error(`${ctx.p('err')}Missing required credentials. Run 'xkit setup' first.`);
                process.exit(1);
            }

            const client = new TwitterClient({ cookies, timeoutMs, quoteDepth });

            // Fetch user timeline with full data (includeRaw: true for URL entities)
            console.log(`\n📥 Fetching tweets from @${normalizedUsername}...`);
            const result = await client.getUserTweets(normalizedUsername, count, { includeRaw: true });

            if (!result.success || !result.tweets) {
                console.error(`${ctx.p('err')}Failed to fetch user timeline: ${result.error}`);
                process.exit(1);
            }

            console.log(`✅ Fetched ${result.tweets.length} tweets`);

            // Apply filters
            let filteredTweets = result.tweets;

            if (cmdOpts.excludeRetweets) {
                const beforeCount = filteredTweets.length;
                filteredTweets = filteredTweets.filter((t) => !t.text?.startsWith('RT @'));
                console.log(`   Filtered out ${beforeCount - filteredTweets.length} retweets`);
            }

            if (minLikes > 0) {
                const beforeCount = filteredTweets.length;
                filteredTweets = filteredTweets.filter((t) => (t.likeCount || 0) >= minLikes);
                console.log(`   Filtered to ${filteredTweets.length} tweets with ${minLikes}+ likes`);
            }

            if (dateFrom || dateTo) {
                const beforeCount = filteredTweets.length;
                filteredTweets = filteredTweets.filter((t) => {
                    if (!t.createdAt) return false;
                    const tweetDate = new Date(t.createdAt);
                    if (dateFrom && tweetDate < dateFrom) return false;
                    if (dateTo && tweetDate > dateTo) return false;
                    return true;
                });
                console.log(`   Filtered to ${filteredTweets.length} tweets in date range`);
            }

            // Extract profile metadata
            console.log('\n👤 Extracting profile metadata...');
            const profileMetadata = extractProfileMetadata(filteredTweets, normalizedUsername);
            console.log(`✓ Profile: ${profileMetadata.displayName || normalizedUsername}`);
            if (profileMetadata.followerCount) {
                console.log(`   Followers: ${profileMetadata.followerCount.toLocaleString()}`);
            }

            // Calculate statistics
            console.log('\n📊 Calculating statistics...');
            const statistics = calculateStatistics(filteredTweets);
            console.log(`✓ Stats: ${statistics.totalLikes.toLocaleString()} likes, ${statistics.totalRetweets.toLocaleString()} retweets`);

            // Save tweets to artifacts
            const tweetsPath = join(artifactsDir, 'tweets.json');
            writeFileSync(tweetsPath, JSON.stringify(filteredTweets, null, 2), 'utf8');
            console.log(`💾 Saved tweets to ${tweetsPath}`);

            // Extract media
            console.log('\n🖼️  Extracting media...');
            const media = extractMedia(filteredTweets);
            console.log(`✓ Found ${media.length} media items`);

            // Deduplicate media by URL
            const uniqueMedia = deduplicateByKey(media, (m: MediaItem) => m.url);
            if (uniqueMedia.length < media.length) {
                console.log(`   Deduplicated to ${uniqueMedia.length} unique items`);
            }

            // Download media if requested
            let imageBuffers: Buffer[] = [];
            let videoPaths: string[] = [];

            if (cmdOpts.includeMedia || cmdOpts.includeImages || cmdOpts.includeVideos) {
                console.log('   Downloading media...');

                const mediaDir = join(artifactsDir, 'media');
                mkdirSync(mediaDir, { recursive: true });

                const mediaHandler = new MediaHandler({
                    includeMedia: true,
                    downloadMedia: true,
                    mediaDir,
                });

                const allMedia = filteredTweets.flatMap((tweet) => tweet.media || []);

                if (allMedia.length > 0) {
                    const progress = new ProgressTracker(allMedia.length, 'Downloading');

                    const downloadedPaths = await mediaHandler.downloadMedia(
                        allMedia.map((m) => ({
                            type: m.type,
                            url: m.url,
                            width: m.width,
                            height: m.height,
                        })),
                        mediaDir
                    );

                    // Update media items with local paths and separate by type
                    for (let i = 0; i < allMedia.length; i++) {
                        const mediaItem = allMedia[i];
                        const path = downloadedPaths[i];

                        progress.increment();

                        if (!path) continue;

                        if (i < uniqueMedia.length) {
                            uniqueMedia[i].localPath = path;
                        }

                        if (mediaItem.type === 'photo' && cmdOpts.includeImages !== false) {
                            try {
                                const { readFile } = await import('node:fs/promises');
                                const buffer = await readFile(path);
                                imageBuffers.push(buffer);
                            } catch (error) {
                                console.warn(`${ctx.p('warn')}Failed to read image ${path}`);
                                errorLogger.log('media-read', (error as Error).message, path);
                            }
                        } else if (mediaItem.type === 'video' && cmdOpts.includeVideos !== false) {
                            videoPaths.push(path);
                        }
                    }

                    console.log(`   ✅ Downloaded ${imageBuffers.length} images, ${videoPaths.length} videos`);
                }
            }

            // Extract articles
            let articles: EnhancedArticleItem[] = [];
            if (cmdOpts.extractArticles) {
                console.log('\n📰 Extracting articles...');

                const progress = new ProgressTracker(filteredTweets.length, 'Processing');

                articles = await extractArticlesEnhanced(filteredTweets, {
                    batchSize: 5,
                    maxRetries: 3,
                    errorLogger,
                    onProgress: (current: number, total: number) => {
                        // Progress is handled by the tracker
                    },
                });

                progress.complete();

                // Deduplicate articles by URL
                const uniqueArticles = deduplicateByKey(articles, (a: EnhancedArticleItem) => a.url);
                if (uniqueArticles.length < articles.length) {
                    console.log(`   Deduplicated to ${uniqueArticles.length} unique articles`);
                    articles = uniqueArticles;
                }

                console.log(`✓ Found ${articles.length} articles`);
            }

            // Extract code snippets
            let codeSnippets: CodeSnippet[] = [];
            let organizedCode: OrganizedCodeSnippets | undefined;
            if (cmdOpts.includeCode) {
                console.log('\n💻 Extracting code snippets...');
                codeSnippets = extractCodeSnippets(filteredTweets);
                console.log(`✓ Found ${codeSnippets.length} code snippets`);

                // Organize code snippets
                if (codeSnippets.length > 0) {
                    organizedCode = organizeCodeSnippets(codeSnippets);
                    console.log(`   Organized by type, component, and category`);

                    // Save organized code separately
                    const organizedPath = join(artifactsDir, 'code-snippets-organized.json');
                    writeFileSync(organizedPath, JSON.stringify(organizedCode, null, 2), 'utf-8');
                    console.log(`   💾 Saved organized code to ${organizedPath}`);
                }
            }

            // Save error log
            errorLogger.save();
            const errorCount = errorLogger.getCount();
            if (errorCount > 0) {
                console.log(`\n⚠️  ${errorCount} errors logged (see errors.log)`);
                const errorSummary = errorLogger.getSummary();
                for (const [operation, count] of Object.entries(errorSummary)) {
                    console.log(`   ${operation}: ${count}`);
                }
            }

            // Build result
            const sweepResult: ProfileSweepResult = {
                username: normalizedUsername,
                profile: profileMetadata,
                statistics,
                tweets: filteredTweets,
                media: uniqueMedia,
                articles,
                codeSnippets,
                organizedCode,
                archivedAt: new Date().toISOString(),
                errors: errorCount > 0 ? {
                    count: errorCount,
                    summary: errorLogger.getSummary(),
                } : undefined,
            };

            // Extract persona if requested
            if (cmdOpts.createSkill) {
                console.log('\n🧠 Extracting persona...');

                const tweetTexts = result.tweets.map((tweet) => tweet.text).filter(Boolean);

                if (tweetTexts.length === 0) {
                    console.error(`${ctx.p('err')}No text content found in tweets`);
                    process.exit(1);
                }

                const analysisOptions: PersonaAnalysisOptions = {
                    includeImages: cmdOpts.includeImages !== false,
                    includeVideos: cmdOpts.includeVideos !== false,
                    maxTweets: count,
                };

                // Initialize Ollama client
                const { OllamaClient } = await import('../bookmark-enrichment/ollama-client.js');
                const ollamaClient = new OllamaClient({
                    host: cmdOpts.host || 'http://localhost:11434',
                    model: cmdOpts.model || 'qwen2.5:7b',
                });

                // Initialize analyzers
                const textAnalyzer = new TextAnalyzer({
                    host: cmdOpts.host || 'http://localhost:11434',
                    model: cmdOpts.model || 'qwen2.5:7b',
                });

                const visionAnalyzer = new VisionAnalyzer(ollamaClient);
                const transcriptionAnalyzer = new TranscriptionAnalyzer(ollamaClient);

                const synthesizer = new PersonaSynthesizer(
                    textAnalyzer,
                    visionAnalyzer,
                    transcriptionAnalyzer,
                    {
                        host: cmdOpts.host || 'http://localhost:11434',
                        model: cmdOpts.model || 'qwen2.5:7b',
                        temperature: 0.7,
                    }
                );

                // Check Ollama availability
                const isAvailable = await synthesizer.isAvailable();
                if (!isAvailable) {
                    console.error(`${ctx.p('err')}Ollama is not available. Start Ollama with: ollama serve`);
                    process.exit(1);
                }

                // Run synthesis
                const personaResult = await synthesizer.synthesize(normalizedUsername, {
                    tweets: tweetTexts,
                    imageBuffers: imageBuffers.length > 0 ? imageBuffers : undefined,
                    videoPaths: videoPaths.length > 0 ? videoPaths : undefined,
                    options: analysisOptions,
                });

                console.log(`✅ Persona extracted for @${normalizedUsername}`);

                // Save persona to artifacts
                sweepResult.persona = personaResult;
                const personaPath = join(artifactsDir, 'persona.json');
                writeFileSync(personaPath, JSON.stringify(personaResult, null, 2), 'utf8');
                console.log(`💾 Saved persona to ${personaPath}`);

                // Generate skill
                console.log('\n✍️  Generating skill...');
                console.log('   💡 Tip: Use ~/dev/agent-skills/utilities/skill-creator for best results');
                console.log('');

                const targetDir = cmdOpts.target
                    ? resolve(cmdOpts.target)
                    : join(homedir(), 'dev', 'agent-skills', 'personas');

                // Create a prompt file for skill-creator
                const skillPromptPath = join(artifactsDir, 'skill-creator-prompt.md');
                const skillPrompt = generateSkillCreatorPrompt(normalizedUsername, personaResult, artifactsDir);
                writeFileSync(skillPromptPath, skillPrompt, 'utf8');
                console.log(`📝 Saved skill-creator prompt to ${skillPromptPath}`);
                console.log('');

                const skillWriter = new SkillWriter({
                    outputDir: targetDir,
                    autoApprove: cmdOpts.autoApprove ?? false,
                });

                const skillResult = await skillWriter.writePersonaSkill(personaResult, targetDir);

                if (skillResult.written.length > 0) {
                    console.log(`✅ Skill written to ${skillResult.written[0]}`);
                } else if (skillResult.review.length > 0) {
                    console.log(`⏳ Skill pending review in ${skillResult.review[0]}`);
                    console.log('');
                    console.log('   Review and approve with:');
                    console.log(`     xkit persona-skill approve ${normalizedUsername}`);
                }

                if (skillResult.errors.length > 0) {
                    console.error(`❌ Errors: ${skillResult.errors.map((e) => e.error).join(', ')}`);
                }
            }

            // Save comprehensive sweep data
            const sweepPath = join(artifactsDir, `${normalizedUsername}-sweep-${getDateStamp()}.json`);
            writeFileSync(sweepPath, JSON.stringify(sweepResult, null, 2), 'utf-8');
            console.log(`\n💾 Saved sweep data to ${sweepPath}`);

            // Generate markdown report
            const markdownPath = join(artifactsDir, `${normalizedUsername}-sweep-${getDateStamp()}.md`);
            const markdown = generateMarkdown(sweepResult);
            writeFileSync(markdownPath, markdown, 'utf-8');
            console.log(`💾 Saved markdown report to ${markdownPath}`);

            // Save statistics separately
            const statsPath = join(artifactsDir, 'statistics.json');
            writeFileSync(statsPath, JSON.stringify(statistics, null, 2), 'utf-8');
            console.log(`💾 Saved statistics to ${statsPath}`);

            // Generate summary
            const summaryPath = join(artifactsDir, 'SWEEP_SUMMARY.md');
            const summary = generateSummary(sweepResult, {
                imageCount: imageBuffers.length,
                videoCount: videoPaths.length,
                artifactsDir,
                duration: Math.round((Date.now() - startTime) / 1000),
            });
            writeFileSync(summaryPath, summary, 'utf-8');
            console.log(`💾 Saved summary to ${summaryPath}`);

            // Clear checkpoint on success
            if (checkpoint) {
                checkpointManager.clear();
            }

            // Final summary
            const duration = Math.round((Date.now() - startTime) / 1000);

            console.log('\n📊 Summary:');
            console.log(`   Username: @${normalizedUsername}`);
            if (profileMetadata.displayName) {
                console.log(`   Name: ${profileMetadata.displayName}`);
            }
            console.log(`   Tweets: ${filteredTweets.length}`);
            console.log(`   Media: ${uniqueMedia.length}`);
            console.log(`   Articles: ${articles.length}`);
            console.log(`   Code snippets: ${codeSnippets.length}`);
            if (statistics) {
                console.log(`   Total engagement: ${statistics.totalLikes.toLocaleString()} likes, ${statistics.totalRetweets.toLocaleString()} retweets`);
            }
            if (cmdOpts.createSkill) {
                console.log(`   Images analyzed: ${imageBuffers.length}`);
                console.log(`   Videos analyzed: ${videoPaths.length}`);
            }
            if (errorCount > 0) {
                console.log(`   Errors: ${errorCount} (see errors.log)`);
            }
            console.log(`   Artifacts: ${artifactsDir}`);
            console.log(`   Duration: ${duration}s (${(filteredTweets.length / duration).toFixed(2)} tweets/s)`);

            console.log('\n✨ Profile sweep complete!');
        });
}

/**
 * Extract media from tweets
 */
function extractMedia(tweets: TweetData[]): MediaItem[] {
    const mediaItems: MediaItem[] = [];

    for (const tweet of tweets) {
        if (tweet.media && tweet.media.length > 0) {
            for (const m of tweet.media) {
                mediaItems.push({
                    type: m.type,
                    url: m.url,
                    videoUrl: m.videoUrl,
                    durationMs: m.durationMs,
                });
            }
        }
    }

    return mediaItems;
}

/**
 * Extract articles from tweet URLs
 */
async function extractArticles(tweets: TweetData[]): Promise<ArticleItem[]> {
    const articles: ArticleItem[] = [];
    const urlExpander = new UrlExpander();
    const articleExtractor = new ArticleExtractor();

    const urlRegex = /https?:\/\/[^\s]+/g;

    for (const tweet of tweets) {
        if (!tweet.text) continue;

        const urls = tweet.text.match(urlRegex);
        if (!urls) continue;

        for (const url of urls) {
            const linkType = detectLinkType(url);

            if (linkType === 'article') {
                try {
                    const expanded = await urlExpander.expand(url);
                    const content = await articleExtractor.extract(expanded.finalUrl);

                    if (content) {
                        articles.push({
                            url: expanded.finalUrl,
                            title: content.title,
                            content: content.content,
                            publishedTime: content.publishedTime,
                        });
                    }
                } catch {
                    continue;
                }
            }
        }
    }

    return articles;
}

/**
 * Categorize code based on content and context
 */
function categorizeCode(code: string, context: string): string {
    const lower = code.toLowerCase() + ' ' + context.toLowerCase();

    if (lower.includes('animation') || lower.includes('transition') || lower.includes('ease') || lower.includes('transform')) {
        return 'animation';
    }
    if (lower.includes('component') || lower.includes('drawer') || lower.includes('modal') || lower.includes('dialog')) {
        return 'component';
    }
    if (lower.includes('style') || lower.includes('css') || code.includes(':') || code.startsWith('--')) {
        return 'styling';
    }
    if (lower.includes('hook') || lower.includes('use')) {
        return 'hooks';
    }
    if (lower.includes('api') || lower.includes('fetch') || lower.includes('promise')) {
        return 'api';
    }

    return 'general';
}

/**
 * Extract component name from code
 */
function extractComponentName(code: string): string | undefined {
    // Handle patterns like "Drawer.NestedRoot"
    const dotMatch = code.match(/^([A-Z][a-zA-Z]+)\./);
    if (dotMatch) {
        return dotMatch[1];
    }

    // Handle PascalCase component names
    if (/^[A-Z][a-zA-Z]+$/.test(code)) {
        return code;
    }

    // Handle "ComponentName" pattern
    const componentMatch = code.match(/([A-Z][a-zA-Z]+)Component/);
    if (componentMatch) {
        return componentMatch[1];
    }

    return undefined;
}

/**
 * Organize code snippets by type, component, and category
 */
function organizeCodeSnippets(snippets: CodeSnippet[]): OrganizedCodeSnippets {
    const organized: OrganizedCodeSnippets = {
        byType: {
            codeBlocks: [],
            inlineCode: [],
            components: [],
            cssProperties: [],
            codeLinks: [],
            imageCode: [],
        },
        byComponent: {},
        byCategory: {},
        all: snippets,
    };

    for (const snippet of snippets) {
        // Organize by type
        switch (snippet.type) {
            case 'code-block':
                organized.byType.codeBlocks.push(snippet);
                break;
            case 'inline-code':
                organized.byType.inlineCode.push(snippet);
                break;
            case 'component':
                organized.byType.components.push(snippet);
                break;
            case 'css-property':
                organized.byType.cssProperties.push(snippet);
                break;
            case 'code-link':
                organized.byType.codeLinks.push(snippet);
                break;
            case 'image-code':
                organized.byType.imageCode.push(snippet);
                break;
        }

        // Organize by component
        if (snippet.componentName) {
            if (!organized.byComponent[snippet.componentName]) {
                organized.byComponent[snippet.componentName] = [];
            }
            organized.byComponent[snippet.componentName].push(snippet);
        }

        // Organize by category
        if (snippet.category) {
            if (!organized.byCategory[snippet.category]) {
                organized.byCategory[snippet.category] = [];
            }
            organized.byCategory[snippet.category].push(snippet);
        }
    }

    return organized;
}

/**
 * Extract code snippets from tweets
 */
function extractCodeSnippets(tweets: TweetData[]): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
    const inlineCodeRegex = /`([^`]+)`/g;
    const urlRegex = /https?:\/\/[^\s]+/g;

    // Code sharing platforms
    const codePlatforms = [
        'github.com',
        'codepen.io',
        'jsfiddle.net',
        'codesandbox.io',
        'stackblitz.com',
        'replit.com',
        'glitch.com',
        'jsbin.com',
        'playcode.io',
        'runkit.com',
    ];

    for (const tweet of tweets) {
        const text = tweet.text || '';
        const author = tweet.author?.username || 'unknown';
        const date = tweet.createdAt || '';
        const tweetUrl = `https://x.com/${author}/status/${tweet.id}`;

        // Extract code blocks (markdown style)
        let match: RegExpExecArray | null;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const code = match[2].trim();
            const language = match[1] || 'unknown';

            snippets.push({
                language,
                code,
                context: `Code block from @${author} on ${date}\nTweet: ${tweetUrl}`,
                type: 'code-block',
                category: categorizeCode(code, text),
                tweetId: tweet.id,
                tweetUrl,
            });
        }

        // Extract inline code (only if substantial - likely component names or APIs)
        const inlineMatches = Array.from(text.matchAll(inlineCodeRegex));
        for (const inlineMatch of inlineMatches) {
            const code = inlineMatch[1];

            const isPascalCase = /^[A-Z][a-zA-Z]+$/.test(code);
            const isComponent = isPascalCase || code.includes('Component') || (code.includes('.') && /^[A-Z]/.test(code));
            const isCSSProperty = code.includes(':') || code.includes('-') || code.startsWith('--');
            const isHook = code.startsWith('use') && /^use[A-Z]/.test(code);

            // Capture substantial or interesting code
            if (
                code.length > 15 ||
                code.includes('(') ||
                code.includes('{') ||
                isComponent ||
                isCSSProperty ||
                isHook
            ) {
                const type = isComponent ? 'component' : isCSSProperty ? 'css-property' : 'inline-code';
                const componentName = isComponent ? extractComponentName(code) : undefined;

                snippets.push({
                    code: code.trim(),
                    context: `Inline code from @${author} on ${date}\nTweet: ${tweetUrl}`,
                    type,
                    category: categorizeCode(code, text),
                    componentName,
                    tweetId: tweet.id,
                    tweetUrl,
                });
            }
        }

        // Check URLs for code repositories and playgrounds
        const urls = text.match(urlRegex);
        if (urls) {
            for (const url of urls) {
                // Skip truncated URLs (containing ellipsis or other invalid characters)
                if (url.includes('…') || url.includes('...')) {
                    continue;
                }

                try {
                    const linkType = detectLinkType(url);
                    const lowerUrl = url.toLowerCase();

                    // Check if it's a code platform
                    const isCodePlatform = codePlatforms.some(platform => lowerUrl.includes(platform));

                    if (linkType === 'github' || isCodePlatform) {
                        snippets.push({
                            code: url,
                            context: `Code link from @${author}: ${text.substring(0, 150)}\nTweet: ${tweetUrl}`,
                            type: 'code-link',
                            category: 'repository',
                            tweetId: tweet.id,
                            tweetUrl,
                        });
                    }
                } catch (error) {
                    // Skip invalid URLs
                    continue;
                }
            }
        }

        // Check for code in images (note: requires vision analysis to extract)
        if (tweet.media && tweet.media.length > 0) {
            const hasImages = tweet.media.some(m => m.type === 'photo');
            if (hasImages) {
                // Add a marker that this tweet has images that might contain code
                const codeKeywords = ['component', 'code', 'snippet', 'function', 'const', 'let', 'var', 'import', 'export', 'react', 'vue', 'svelte'];
                const hasCodeKeywords = codeKeywords.some(keyword => text.toLowerCase().includes(keyword));

                if (hasCodeKeywords) {
                    snippets.push({
                        code: `[IMAGE: Potential code screenshot - requires vision analysis]`,
                        context: `Tweet with image from @${author} on ${date}\nText: ${text}\nTweet: ${tweetUrl}`,
                        type: 'image-code',
                        category: categorizeCode('', text),
                        tweetId: tweet.id,
                        tweetUrl,
                    });
                }
            }
        }
    }

    return snippets;
}

/**
 * Generate markdown report
 */
function generateMarkdown(result: ProfileSweepResult): string {
    const lines: string[] = [];

    lines.push(`# Profile Sweep: @${result.username}`);
    lines.push('');
    lines.push(`**Archived:** ${new Date(result.archivedAt).toLocaleString()}`);
    lines.push(`**Source:** https://x.com/${result.username}`);
    lines.push('');

    if (result.profile) {
        lines.push('## Profile');
        lines.push('');
        if (result.profile.displayName) lines.push(`**Name:** ${result.profile.displayName}`);
        if (result.profile.bio) lines.push(`**Bio:** ${result.profile.bio}`);
        if (result.profile.location) lines.push(`**Location:** ${result.profile.location}`);
        if (result.profile.website) lines.push(`**Website:** ${result.profile.website}`);
        if (result.profile.followerCount) lines.push(`**Followers:** ${result.profile.followerCount.toLocaleString()}`);
        if (result.profile.followingCount) lines.push(`**Following:** ${result.profile.followingCount.toLocaleString()}`);
        if (result.profile.tweetCount) lines.push(`**Total Tweets:** ${result.profile.tweetCount.toLocaleString()}`);
        if (result.profile.joinDate) lines.push(`**Joined:** ${result.profile.joinDate}`);
        lines.push('');
    }

    if (result.statistics) {
        lines.push('## Statistics');
        lines.push('');
        lines.push(`- **Total Engagement:** ${result.statistics.totalLikes.toLocaleString()} likes, ${result.statistics.totalRetweets.toLocaleString()} retweets`);
        lines.push(`- **Average Engagement:** ${result.statistics.averageLikes} likes, ${result.statistics.averageRetweets} retweets per tweet`);
        lines.push('');

        if (result.statistics.topTweets.length > 0) {
            lines.push('### Top Tweets');
            lines.push('');
            for (const tweet of result.statistics.topTweets.slice(0, 5)) {
                lines.push(`- [${tweet.likes.toLocaleString()} ❤️, ${tweet.retweets.toLocaleString()} 🔄] ${tweet.text}`);
                lines.push(`  ${tweet.url}`);
            }
            lines.push('');
        }

        const topHashtags = Object.entries(result.statistics.hashtagFrequency)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 10);
        if (topHashtags.length > 0) {
            lines.push('### Top Hashtags');
            lines.push('');
            for (const [tag, count] of topHashtags) {
                lines.push(`- ${tag} (${count})`);
            }
            lines.push('');
        }

        const topDomains = Object.entries(result.statistics.linkDomains)
            .sort(([, a], [, b]) => (b as number) - (a as number))
            .slice(0, 10);
        if (topDomains.length > 0) {
            lines.push('### Most Linked Domains');
            lines.push('');
            for (const [domain, count] of topDomains) {
                lines.push(`- ${domain} (${count})`);
            }
            lines.push('');
        }
    }

    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Tweets archived:** ${result.tweets.length}`);
    lines.push(`- **Media items:** ${result.media.length}`);
    lines.push(`- **Articles:** ${result.articles.length}`);
    lines.push(`- **Code snippets:** ${result.codeSnippets.length}`);
    if (result.errors) {
        lines.push(`- **Errors:** ${result.errors.count}`);
    }
    lines.push('');

    if (result.media.length > 0) {
        lines.push('## Media');
        lines.push('');
        for (const item of result.media.slice(0, 50)) {
            lines.push(`- [${item.type.toUpperCase()}] ${item.url}`);
            if (item.localPath) lines.push(`  - Local: ${item.localPath}`);
            if (item.videoUrl) lines.push(`  - Video: ${item.videoUrl}`);
            if (item.durationMs) lines.push(`  - Duration: ${(item.durationMs / 1000).toFixed(1)}s`);
        }
        if (result.media.length > 50) {
            lines.push(`\n... and ${result.media.length - 50} more`);
        }
        lines.push('');
    }

    if (result.articles.length > 0) {
        lines.push('## Articles');
        lines.push('');
        for (const article of result.articles.slice(0, 20)) {
            lines.push(`### ${article.title || 'Untitled'}`);
            lines.push('');
            lines.push(`**URL:** ${article.url}`);
            if (article.author) lines.push(`**Author:** ${article.author}`);
            if (article.publishedTime) lines.push(`**Published:** ${article.publishedTime}`);
            if (article.tweetUrl) lines.push(`**Shared in:** ${article.tweetUrl}`);
            if (article.description) {
                lines.push('');
                lines.push(article.description);
            } else if (article.content) {
                lines.push('');
                lines.push(article.content.substring(0, 300));
                if (article.content.length > 300) lines.push('...');
            }
            lines.push('');
        }
        if (result.articles.length > 20) {
            lines.push(`... and ${result.articles.length - 20} more articles`);
            lines.push('');
        }
    }

    if (result.codeSnippets.length > 0) {
        lines.push('## Code Snippets');
        lines.push('');
        for (const snippet of result.codeSnippets.slice(0, 20)) {
            lines.push(`### ${snippet.context}`);
            lines.push('');
            if (snippet.language) {
                lines.push(`\`\`\`${snippet.language}`);
            } else {
                lines.push('```');
            }
            lines.push(snippet.code);
            lines.push('```');
            lines.push('');
        }
        if (result.codeSnippets.length > 20) {
            lines.push(`... and ${result.codeSnippets.length - 20} more snippets`);
            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Generate summary document
 */
function generateSummary(
    result: ProfileSweepResult,
    stats: { imageCount: number; videoCount: number; artifactsDir: string; duration: number }
): string {
    const lines: string[] = [];

    lines.push(`# @${result.username} Profile Sweep`);
    lines.push('');
    lines.push(`**Sweep Date:** ${new Date(result.archivedAt).toLocaleString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📊 Sweep Summary');
    lines.push('');
    lines.push('| Component | Status | Count | Details |');
    lines.push('|-----------|--------|-------|---------|');
    lines.push(`| **Tweets** | ✅ | ${result.tweets.length} | Full timeline archive |`);
    lines.push(`| **Media** | ✅ | ${result.media.length} | Photos, videos, GIFs |`);
    lines.push(`| **Articles** | ${result.articles.length > 0 ? '✅' : '⚠️'} | ${result.articles.length} | Extracted from links |`);
    lines.push(`| **Code Snippets** | ${result.codeSnippets.length > 0 ? '✅' : '⚠️'} | ${result.codeSnippets.length} | Code blocks and GitHub links |`);
    if (result.persona) {
        lines.push(`| **Persona** | ✅ | 1 | AI-extracted persona |`);
        lines.push(`| **Images Analyzed** | ✅ | ${stats.imageCount} | Vision analysis |`);
        lines.push(`| **Videos Analyzed** | ${stats.videoCount > 0 ? '✅' : '⚠️'} | ${stats.videoCount} | Transcription |`);
    }
    if (result.errors) {
        lines.push(`| **Errors** | ⚠️ | ${result.errors.count} | See errors.log |`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');

    if (result.profile) {
        lines.push('## 👤 Profile Info');
        lines.push('');
        if (result.profile.displayName) lines.push(`**Name:** ${result.profile.displayName}`);
        if (result.profile.bio) lines.push(`**Bio:** ${result.profile.bio}`);
        if (result.profile.followerCount) lines.push(`**Followers:** ${result.profile.followerCount.toLocaleString()}`);
        if (result.profile.followingCount) lines.push(`**Following:** ${result.profile.followingCount.toLocaleString()}`);
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    if (result.statistics) {
        lines.push('## 📈 Engagement Stats');
        lines.push('');
        lines.push(`**Total Likes:** ${result.statistics.totalLikes.toLocaleString()}`);
        lines.push(`**Total Retweets:** ${result.statistics.totalRetweets.toLocaleString()}`);
        lines.push(`**Average Likes:** ${result.statistics.averageLikes} per tweet`);
        lines.push(`**Average Retweets:** ${result.statistics.averageRetweets} per tweet`);
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    lines.push('## 📁 Archive Structure');
    lines.push('');
    lines.push('```');
    lines.push(`${stats.artifactsDir}/`);
    lines.push('├── tweets.json                    # Full tweet data');
    lines.push('├── *-sweep-YYYY-MM-DD.json        # Comprehensive sweep data');
    lines.push('├── *-sweep-YYYY-MM-DD.md          # Human-readable report');
    lines.push('├── statistics.json                # Engagement and posting stats');
    lines.push('├── SWEEP_SUMMARY.md               # This file');
    if (result.persona) {
        lines.push('├── persona.json                   # AI-extracted persona');
    }
    if (result.organizedCode) {
        lines.push('├── code-snippets-organized.json   # Organized code snippets');
    }
    if (result.errors) {
        lines.push('├── errors.log                     # Error log');
    }
    if (result.media.length > 0) {
        lines.push('└── media/                         # Downloaded media files');
    }
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## ⏱️  Performance');
    lines.push('');
    lines.push(`**Total Duration:** ${stats.duration}s`);
    lines.push(`**Tweets/second:** ${(result.tweets.length / stats.duration).toFixed(2)}`);
    if (result.articles.length > 0) {
        lines.push(`**Articles/second:** ${(result.articles.length / stats.duration).toFixed(2)}`);
    }
    lines.push('');

    return lines.join('\n');
}

/**
 * Get date stamp for filenames
 */
function getDateStamp(): string {
    return new Date().toISOString().split('T')[0];
}

/**
 * Generate a prompt for the skill-creator skill
 */
function generateSkillCreatorPrompt(username: string, persona: unknown, artifactsDir: string): string {
    const lines: string[] = [];

    lines.push('# Skill Creator Prompt for @' + username);
    lines.push('');
    lines.push('## Goal');
    lines.push('');
    lines.push(`Create a high-quality persona skill for @${username} that can be used in Claude conversations.`);
    lines.push('');
    lines.push('## Context');
    lines.push('');
    lines.push(`This persona was extracted from ${username}'s Twitter profile using xKit profile-sweep.`);
    lines.push('');
    lines.push('**Artifacts location:**');
    lines.push(`- Persona data: ${artifactsDir}/persona.json`);
    lines.push(`- Tweets: ${artifactsDir}/tweets.json`);
    lines.push(`- Media: ${artifactsDir}/media/`);
    lines.push('');
    lines.push('## Requirements');
    lines.push('');
    lines.push('1. Create a persona skill that captures:');
    lines.push('   - Communication style and tone');
    lines.push('   - Technical expertise level');
    lines.push('   - Core values and interests');
    lines.push('   - Topic clusters and areas of focus');
    lines.push('');
    lines.push('2. The skill should be usable for:');
    lines.push('   - Emulating writing style');
    lines.push('   - Understanding perspective and viewpoints');
    lines.push('   - Generating content in their voice');
    lines.push('');
    lines.push('3. Output location: ~/dev/agent-skills/personas/@' + username + '-persona/');
    lines.push('');
    lines.push('## Persona Summary');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(persona, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('## Next Steps');
    lines.push('');
    lines.push('Use the skill-creator skill to generate the final SKILL.md:');
    lines.push('');
    lines.push('```bash');
    lines.push('# In Claude with skill-creator skill active:');
    lines.push(`"Create a persona skill for @${username} using the data in ${artifactsDir}/persona.json"`);
    lines.push('```');

    return lines.join('\n');
}
