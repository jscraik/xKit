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
    title?: string;
    content?: string;
    publishedTime?: string;
}

interface CodeSnippet {
    language?: string;
    code: string;
    context: string;
}

interface ProfileSweepResult {
    username: string;
    displayName?: string;
    bio?: string;
    profileImageUrl?: string;
    followerCount?: number;
    followingCount?: number;
    tweets: TweetData[];
    media: MediaItem[];
    articles: ArticleItem[];
    codeSnippets: CodeSnippet[];
    archivedAt: string;
    persona?: unknown;
}

/**
 * Register profile sweep command for comprehensive profile archiving.
 */
export function registerProfileSweepCommand(program: Command, ctx: CliContext): void {
    program
        .command('profile-sweep')
        .description('Comprehensive profile archive with media, articles, code, and optional persona extraction')
        .argument('<username>', 'Username (e.g., @jh3yy or jh3yy)')
        .option('-n, --limit <number>', 'Number of tweets to fetch (default: 200, max: 3200)', '200')
        .option('--extract-articles', 'Extract full article content from links', false)
        .option('--include-code', 'Extract code snippets from tweets', true)
        .option('--include-media', 'Download all media (images and videos)', false)
        .option('--include-images', 'Download and analyze images', false)
        .option('--include-videos', 'Download videos', false)
        .option('--create-skill', 'Extract persona and generate Claude skill', false)
        .option('-t, --target <path>', 'Target directory for skill output', join(homedir(), 'dev', 'agents-skills', 'personas'))
        .option('--model <name>', 'Ollama model for persona extraction (default: qwen2.5:7b)', 'qwen2.5:7b')
        .option('--host <url>', 'Ollama host URL (default: http://localhost:11434)', 'http://localhost:11434')
        .option('--auto-approve', 'Write skill directly without review', false)
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

            const normalizedUsername = normalizeHandle(username);
            if (!normalizedUsername) {
                console.error(`${ctx.p('err')}Invalid username: ${username}`);
                process.exit(2);
            }

            // Create artifacts directory
            const artifactsDir = join(process.cwd(), 'artifacts', normalizedUsername);
            mkdirSync(artifactsDir, { recursive: true });

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

            // Fetch user timeline
            console.log(`\n📥 Fetching tweets from @${normalizedUsername}...`);
            const result = await client.getUserTweets(normalizedUsername, count, { includeRaw: false });

            if (!result.success || !result.tweets) {
                console.error(`${ctx.p('err')}Failed to fetch user timeline: ${result.error}`);
                process.exit(1);
            }

            console.log(`✅ Fetched ${result.tweets.length} tweets`);

            // Save tweets to artifacts
            const tweetsPath = join(artifactsDir, 'tweets.json');
            writeFileSync(tweetsPath, JSON.stringify(result.tweets, null, 2), 'utf8');
            console.log(`💾 Saved tweets to ${tweetsPath}`);

            // Extract media
            console.log('\n🖼️  Extracting media...');
            const media = extractMedia(result.tweets);
            console.log(`✓ Found ${media.length} media items`);

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

                const allMedia = result.tweets.flatMap((tweet) => tweet.media || []);

                if (allMedia.length > 0) {
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

                        if (!path) continue;

                        if (i < media.length) {
                            media[i].localPath = path;
                        }

                        if (mediaItem.type === 'photo' && cmdOpts.includeImages !== false) {
                            try {
                                const { readFile } = await import('node:fs/promises');
                                const buffer = await readFile(path);
                                imageBuffers.push(buffer);
                            } catch (error) {
                                console.warn(`${ctx.p('warn')}Failed to read image ${path}`);
                            }
                        } else if (mediaItem.type === 'video' && cmdOpts.includeVideos !== false) {
                            videoPaths.push(path);
                        }
                    }

                    console.log(`   ✅ Downloaded ${imageBuffers.length} images, ${videoPaths.length} videos`);
                }
            }

            // Extract articles
            let articles: ArticleItem[] = [];
            if (cmdOpts.extractArticles) {
                console.log('\n📰 Extracting articles...');
                articles = await extractArticles(result.tweets);
                console.log(`✓ Found ${articles.length} articles`);
            }

            // Extract code snippets
            let codeSnippets: CodeSnippet[] = [];
            if (cmdOpts.includeCode) {
                console.log('\n💻 Extracting code snippets...');
                codeSnippets = extractCodeSnippets(result.tweets);
                console.log(`✓ Found ${codeSnippets.length} code snippets`);
            }

            // Build result
            const sweepResult: ProfileSweepResult = {
                username: normalizedUsername,
                displayName: result.tweets[0]?.author?.name,
                tweets: result.tweets,
                media,
                articles,
                codeSnippets,
                archivedAt: new Date().toISOString(),
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
                    : join(homedir(), 'dev', 'agents-skills', 'personas');

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

            // Final summary
            const duration = Math.round((Date.now() - startTime) / 1000);

            console.log('\n📊 Summary:');
            console.log(`   Username: @${normalizedUsername}`);
            console.log(`   Tweets: ${result.tweets.length}`);
            console.log(`   Media: ${media.length}`);
            console.log(`   Articles: ${articles.length}`);
            console.log(`   Code snippets: ${codeSnippets.length}`);
            if (cmdOpts.createSkill) {
                console.log(`   Images analyzed: ${imageBuffers.length}`);
                console.log(`   Videos analyzed: ${videoPaths.length}`);
            }
            console.log(`   Artifacts: ${artifactsDir}`);
            console.log(`   Duration: ${duration}s`);

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
            snippets.push({
                language: match[1] || 'unknown',
                code: match[2].trim(),
                context: `Code block from @${author} on ${date}\nTweet: ${tweetUrl}`,
            });
        }

        // Extract inline code (only if substantial - likely component names or APIs)
        const inlineMatches = Array.from(text.matchAll(inlineCodeRegex));
        for (const inlineMatch of inlineMatches) {
            const code = inlineMatch[1];
            // Look for component-like patterns or substantial code
            if (
                code.length > 20 ||
                code.includes('(') ||
                code.includes('{') ||
                /^[A-Z][a-zA-Z]+$/.test(code) || // PascalCase (React components)
                code.includes('Component') ||
                code.includes('Hook') ||
                code.includes('use[A-Z]') // React hooks
            ) {
                snippets.push({
                    code: code.trim(),
                    context: `Inline code from @${author} on ${date}\nTweet: ${tweetUrl}`,
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

    if (result.displayName) {
        lines.push('## Profile');
        lines.push('');
        lines.push(`**Name:** ${result.displayName}`);
        if (result.followerCount) lines.push(`**Followers:** ${result.followerCount.toLocaleString()}`);
        if (result.followingCount) lines.push(`**Following:** ${result.followingCount.toLocaleString()}`);
        if (result.bio) {
            lines.push('');
            lines.push(`**Bio:** ${result.bio}`);
        }
        lines.push('');
    }

    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Tweets archived:** ${result.tweets.length}`);
    lines.push(`- **Media items:** ${result.media.length}`);
    lines.push(`- **Articles:** ${result.articles.length}`);
    lines.push(`- **Code snippets:** ${result.codeSnippets.length}`);
    lines.push('');

    if (result.media.length > 0) {
        lines.push('## Media');
        lines.push('');
        for (const item of result.media) {
            lines.push(`- [${item.type.toUpperCase()}] ${item.url}`);
            if (item.localPath) lines.push(`  - Local: ${item.localPath}`);
            if (item.videoUrl) lines.push(`  - Video: ${item.videoUrl}`);
            if (item.durationMs) lines.push(`  - Duration: ${(item.durationMs / 1000).toFixed(1)}s`);
        }
        lines.push('');
    }

    if (result.articles.length > 0) {
        lines.push('## Articles');
        lines.push('');
        for (const article of result.articles) {
            lines.push(`### ${article.title || 'Untitled'}`);
            lines.push('');
            lines.push(`**URL:** ${article.url}`);
            if (article.publishedTime) lines.push(`**Published:** ${article.publishedTime}`);
            if (article.content) {
                lines.push('');
                lines.push(article.content.substring(0, 500));
                if (article.content.length > 500) lines.push('...');
            }
            lines.push('');
        }
    }

    if (result.codeSnippets.length > 0) {
        lines.push('## Code Snippets');
        lines.push('');
        for (const snippet of result.codeSnippets) {
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
    }

    lines.push('## Tweets');
    lines.push('');
    for (const tweet of result.tweets) {
        lines.push(`### ${tweet.createdAt || 'Unknown date'}`);
        lines.push('');
        lines.push(tweet.text || '');
        lines.push('');
        lines.push(`**Link:** https://x.com/${tweet.author.username}/status/${tweet.id}`);
        if (tweet.likeCount) lines.push(`**Likes:** ${tweet.likeCount}`);
        if (tweet.retweetCount) lines.push(`**Retweets:** ${tweet.retweetCount}`);
        if (tweet.replyCount) lines.push(`**Replies:** ${tweet.replyCount}`);
        lines.push('');
        lines.push('---');
        lines.push('');
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
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📁 Archive Structure');
    lines.push('');
    lines.push('```');
    lines.push(`${stats.artifactsDir}/`);
    lines.push('├── tweets.json                    # Full tweet data');
    lines.push('├── *-sweep-YYYY-MM-DD.json        # Comprehensive sweep data');
    lines.push('├── *-sweep-YYYY-MM-DD.md          # Human-readable report');
    lines.push('├── SWEEP_SUMMARY.md               # This file');
    if (result.persona) {
        lines.push('├── persona.json                   # AI-extracted persona');
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
    lines.push('3. Output location: ~/dev/agents-skills/personas/@' + username + '-persona/');
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
