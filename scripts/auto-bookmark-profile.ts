#!/usr/bin/env node

/**
 * Auto-bookmark all tweets from a user profile
 *
 * This script uses Playwright to:
 * 1. Load your existing Twitter/X cookies from Safari/Chrome/Firefox
 * 2. Navigate to a user's profile
 * 3. Scroll through all their tweets
 * 4. Click bookmark on each unbookmarked tweet
 * 5. Track progress and resume from last position
 *
 * Usage:
 *   npx tsx scripts/auto-bookmark-profile.ts @jh3yy
 *   npx tsx scripts/auto-bookmark-profile.ts @jh3yy --max-tweets 500
 *   npx tsx scripts/auto-bookmark-profile.ts @jh3yy --state-path ./bookmark-state.json
 */

import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveCredentials, type CookieSource } from '../dist/lib/cookies.js';

interface BookmarkState {
    username: string;
    bookmarkedIds: string[];
    lastScrollHeight: number;
    totalFound: number;
    totalBookmarked: number;
    alreadyBookmarked: number;
    skipped: number;
    updatedAt: string;
}

interface ScriptOptions {
    username: string;
    maxTweets?: number;
    statePath: string;
    headless: boolean;
    scrollDelay: number;
    cookieSource: CookieSource[];
    allCode: boolean; // If true, bookmark all tweets (not just code tweets)
}

const DEFAULT_OPTIONS: Partial<ScriptOptions> = {
    statePath: './bookmark-state.json',
    headless: false, // Show browser so you can monitor progress
    scrollDelay: 2000, // ms to wait after scroll
    cookieSource: ['safari', 'chrome', 'firefox'], // Try all browsers
    allCode: false, // By default, only bookmark code tweets
};

function parseArgs(): ScriptOptions {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
Auto-Bookmark Profile - Bookmark code tweets from a user

Usage:
  npx tsx scripts/auto-bookmark-profile.ts <username> [options]

Arguments:
  username              Twitter/X username (with or without @)

Options:
  --max-tweets <number> Maximum number of tweets to process (default: unlimited)
  --state-path <path>   Path to state file for resume capability (default: ./bookmark-state.json)
  --headless            Run in headless mode (default: show browser)
  --scroll-delay <ms>   Delay after scroll in milliseconds (default: 2000)
  --cookie-source <src> Cookie source: safari, chrome, or firefox (default: try all)
  --all-code            Bookmark all tweets (not just code tweets)
  --help, -h            Show this help message

Examples:
  # Basic usage - bookmark only code tweets from @jh3yy
  npx tsx scripts/auto-bookmark-profile.ts @jh3yy

  # Limit to 500 tweets
  npx tsx scripts/auto-bookmark-profile.ts @jh3yy --max-tweets 500

  # Bookmark ALL tweets (not just code)
  npx tsx scripts/auto-bookmark-profile.ts @jh3yy --all-code

Notes:
  - By default, only bookmarks tweets containing code (CSS, JS, TS, animations, etc.)
  - Script resumes from last position if state file exists
  - Already bookmarked tweets are skipped
  - Progress is saved after each bookmark
  - Press Ctrl+C to stop (state is saved automatically)
  - Automatically uses cookies from Safari/Chrome/Firefox

Code detection indicators:
  - Code blocks: \`\`\` tags
  - Languages: CSS, HTML, JavaScript, TypeScript
  - Syntax: function(), const, =>, etc.
  - CSS: animation, transform, filter, keyframes
  - Files: .css, .js, .ts
`);
        process.exit(0);
    }

    const username = args[0].replace('@', '');
    const options: ScriptOptions = {
        username,
        statePath: DEFAULT_OPTIONS.statePath!,
        headless: false,
        scrollDelay: DEFAULT_OPTIONS.scrollDelay!,
        cookieSource: DEFAULT_OPTIONS.cookieSource!,
        allCode: DEFAULT_OPTIONS.allCode!,
    };

    // Parse options
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--max-tweets':
                options.maxTweets = parseInt(args[++i], 10);
                break;
            case '--state-path':
                options.statePath = args[++i];
                break;
            case '--headless':
                options.headless = true;
                break;
            case '--scroll-delay':
                options.scrollDelay = parseInt(args[++i], 10);
                break;
            case '--cookie-source':
                const source = args[++i];
                if (['safari', 'chrome', 'firefox'].includes(source)) {
                    options.cookieSource = [source as CookieSource];
                } else {
                    console.error(`Invalid cookie source: ${source}. Must be safari, chrome, or firefox.`);
                    process.exit(1);
                }
                break;
            case '--all-code':
                options.allCode = true;
                break;
            default:
                if (arg.startsWith('--')) {
                    console.error(`Unknown option: ${arg}`);
                    process.exit(1);
                }
        }
    }

    return options;
}

function loadState(statePath: string): BookmarkState | null {
    if (!existsSync(statePath)) {
        return null;
    }
    try {
        const data = readFileSync(statePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return null;
    }
}

function saveState(statePath: string, state: BookmarkState): void {
    state.updatedAt = new Date().toISOString();
    writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

async function setupBrowser(cookies: { authToken: string; ct0: string }, headless: boolean): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
    const browser = await chromium.launch({
        headless,
        // Slow down actions to be more human-like
        slowMo: 50,
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });

    // Set cookies from your browser
    await context.addCookies([
        {
            name: 'auth_token',
            value: cookies.authToken,
            domain: '.x.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax' as const,
        },
        {
            name: 'ct0',
            value: cookies.ct0,
            domain: '.x.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax' as const,
        },
    ]);

    const page = await context.newPage();

    return { browser, context, page };
}

async function scrollToLoadTweets(
    page: Page,
    options: ScriptOptions,
    state: BookmarkState,
): Promise<{ found: Set<string>; stoppedEarly: boolean }> {
    const tweetIds = new Set<string>();
    const existingIds = new Set(state.bookmarkedIds);
    let scrollHeight = 0;
    let sameHeightCount = 0;
    const maxSameHeight = 3;
    let stopRequested = false;

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n\n⚠️  Stop requested! Saving progress...');
        stopRequested = true;
    });

    console.log(`\n📜 Scrolling through @${options.username}'s profile to load tweets...`);

    while (!stopRequested) {
        // Extract tweet IDs from current view
        const tweets = await page.evaluate(() => {
            const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
            return Array.from(tweetElements).map(el => {
                const link = el.querySelector('a[href*="/status/"]');
                return link?.getAttribute('href')?.split('/status/')[1]?.split('?')[0] || '';
            }).filter(id => id.length > 0);
        });

        for (const id of tweets) {
            if (!existingIds.has(id)) {
                tweetIds.add(id);
            }
        }

        const newCount = tweetIds.size;
        console.log(`   Found ${newCount} new tweets (total unique: ${newCount + existingIds.size})`);

        // Check max tweets limit
        if (options.maxTweets && tweetIds.size >= options.maxTweets) {
            console.log(`   ✅ Reached max tweets limit (${options.maxTweets})`);
            break;
        }

        // Scroll down
        await page.evaluate(() => {
            window.scrollBy(0, window.innerHeight);
        });

        // Wait for new content to load
        await page.waitForTimeout(options.scrollDelay);

        // Check if we've reached the bottom
        const newHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        if (newHeight === scrollHeight) {
            sameHeightCount++;
            if (sameHeightCount >= maxSameHeight) {
                console.log(`   ✅ Reached end of profile`);
                break;
            }
        } else {
            sameHeightCount = 0;
            scrollHeight = newHeight;
        }
    }

    return { found: tweetIds, stoppedEarly: stopRequested };
}

/**
 * Check if a tweet contains code or code-related content
 */
async function hasCodeContent(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
        const tweetText = document.querySelector('[data-testid="tweet"]')?.textContent || '';

        // Check for code block indicators (Twitter doesn't have real code blocks, but people use patterns)
        const codeIndicators = [
            '```',          // Markdown code blocks
            'code snippet',  // Explicit mention
            'CSS',          // Web technologies
            'HTML',         // Web technologies
            'JavaScript',   // Programming language
            'TypeScript',   // Programming language
            'JS',           // JavaScript abbreviation
            'TS',           // TypeScript abbreviation
            'function(',     // Code syntax
            'const ',        // Code syntax
            'let ',         // Code syntax
            'var ',         // Code syntax
            '=>',           // Arrow functions
            '.css',         // CSS files
            '.js',          // JS files
            '.ts',          // TS files
            'animation',    // CSS animations (jh3yy's specialty)
            'transform',    // CSS transforms
            'filter',       // CSS filters
            'keyframes',    // CSS keyframes
            '<div',         // HTML tags
            '<style',       // HTML tags
            '{ display:',   // CSS inline
            'background:',  // CSS properties
            '@keyframes',   // CSS at-rule
        ];

        const lowerText = tweetText.toLowerCase();
        return codeIndicators.some(indicator => lowerText.includes(indicator.toLowerCase()));
    });
}

async function bookmarkTweets(
    page: Page,
    username: string,
    tweetIds: Set<string>,
    bookmarkedIds: Set<string>,
    allCode: boolean,
): Promise<{ bookmarked: string[]; alreadyBookmarked: number; skipped: number }> {
    const newlyBookmarked: string[] = [];
    let alreadyBookmarked = 0;
    let skipped = 0;

    console.log(`\n📌 Bookmarking ${tweetIds.size} tweets...`);
    console.log(`   Mode: ${allCode ? 'ALL tweets' : 'CODE-ONLY tweets'}`);
    console.log(`   This may take a while. Please don't interfere with the browser.\n`);

    let processed = 0;
    for (const tweetId of tweetIds) {
        processed++;

        try {
            // Navigate to the tweet
            const url = `https://x.com/${username}/status/${tweetId}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

            // Wait for tweet to load
            await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 }).catch(() => {});

            // Check if already bookmarked
            const isBookmarked = await page.evaluate(() => {
                const bookmarkButton = document.querySelector('[data-testid="bookmark"]');
                const svg = bookmarkButton?.querySelector('svg');
                // Check if bookmark is active (filled)
                return svg?.getAttribute('data-testid') === 'BookmarkFill';
            });

            if (isBookmarked) {
                alreadyBookmarked++;
                bookmarkedIds.add(tweetId);
                console.log(`[${processed}/${tweetIds.size}] ✅ Already bookmarked: ${tweetId}`);
                continue;
            }

            // Check if tweet contains code (unless --all-code flag is set)
            if (!allCode) {
                const hasCode = await hasCodeContent(page);
                if (!hasCode) {
                    skipped++;
                    console.log(`[${processed}/${tweetIds.size}] ⏭️  Skipped (no code): ${tweetId}`);
                    continue;
                }
            }

            // Click bookmark button
            await page.click('[data-testid="bookmark"]');
            await page.waitForTimeout(500); // Brief pause for the bookmark to register

            newlyBookmarked.push(tweetId);
            bookmarkedIds.add(tweetId);
            console.log(`[${processed}/${tweetIds.size}] 📌 Bookmarked: ${tweetId}`);

        } catch (error) {
            skipped++;
            console.log(`[${processed}/${tweetIds.size}] ⚠️  Skipped ${tweetId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // Small delay between bookmarks to be more human-like
        await page.waitForTimeout(300 + Math.random() * 200);
    }

    return { bookmarked: newlyBookmarked, alreadyBookmarked, skipped };
}

async function main() {
    const options = parseArgs();

    console.log(`\n🤖 Auto-Bookmark Profile`);
    console.log(`═`.repeat(50));
    console.log(`   Username: @${options.username}`);
    console.log(`   Max tweets: ${options.maxTweets || 'unlimited'}`);
    console.log(`   State path: ${options.statePath}`);
    console.log(`   Headless: ${options.headless}`);
    console.log(`   Cookie source: ${options.cookieSource.join(', ')}`);
    console.log(`   Mode: ${options.allCode ? 'ALL tweets' : 'CODE-ONLY tweets'}`);
    console.log(`═`.repeat(50));

    // Get cookies from browser
    console.log(`\n🍪 Getting cookies from browser...`);
    const { cookies, warnings } = await resolveCredentials({ cookieSource: options.cookieSource });

    for (const warning of warnings) {
        console.warn(`⚠️  ${warning}`);
    }

    if (!cookies.authToken || !cookies.ct0) {
        console.error(`\n❌ Could not get required cookies from browser.`);
        console.error(`\nPlease:`);
        console.error(`1. Make sure you're logged into Twitter/X in ${options.cookieSource.join(' or ')}`);
        console.error(`2. Try specifying a different browser with --cookie-source`);
        console.error(`\nCookie source: ${cookies.source}`);
        process.exit(1);
    }

    console.log(`   ✅ Got cookies from ${cookies.source}`);

    // Load or initialize state
    let state = loadState(options.statePath);
    if (state) {
        console.log(`\n📂 Resuming from previous session:`);
        console.log(`   Previously bookmarked: ${state.bookmarkedIds.length}`);
        console.log(`   Last updated: ${state.updatedAt}`);
    } else {
        state = {
            username: options.username,
            bookmarkedIds: [],
            lastScrollHeight: 0,
            totalFound: 0,
            totalBookmarked: 0,
            alreadyBookmarked: 0,
            skipped: 0,
            updatedAt: new Date().toISOString(),
        };
    }

    const bookmarkedSet = new Set(state.bookmarkedIds);

    // Setup browser with cookies
    console.log(`\n🌐 Starting browser...`);
    const { browser, page } = await setupBrowser(
        { authToken: cookies.authToken!, ct0: cookies.ct0! },
        options.headless,
    );

    try {
        // Navigate to profile
        console.log(`\n📍 Navigating to @${options.username}'s profile...`);
        await page.goto(`https://x.com/${options.username}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Scroll to find all tweets
        const { found, stoppedEarly } = await scrollToLoadTweets(page, options, state);

        state.totalFound = found.size;

        if (found.size === 0) {
            console.log(`\n⚠️  No new tweets found to bookmark.`);
        } else {
            // Bookmark the tweets
            const result = await bookmarkTweets(page, options.username, found, bookmarkedSet, options.allCode);

            state.bookmarkedIds = Array.from(bookmarkedSet);
            state.totalBookmarked += result.bookmarked.length;
            state.alreadyBookmarked += result.alreadyBookmarked;
            state.skipped += result.skipped;

            // Save final state
            saveState(options.statePath, state);

            // Summary
            console.log(`\n` + `═`.repeat(50));
            console.log(`📊 Summary`);
            console.log(`═`.repeat(50));
            console.log(`   Newly bookmarked: ${result.bookmarked.length}`);
            console.log(`   Already bookmarked: ${result.alreadyBookmarked}`);
            console.log(`   Skipped: ${result.skipped}`);
            console.log(`   Total bookmarks: ${state.bookmarkedIds.length}`);
            console.log(`═`.repeat(50));

            if (stoppedEarly) {
                console.log(`\n⚠️  Stopped early. Run again to resume from saved state.`);
            }
        }

        console.log(`\n✅ Script complete! State saved to: ${options.statePath}`);
        console.log(`\nNext step: Export bookmarks with:`);
        console.log(`   node scripts/export-bookmarks-by-year.mjs --filter-by ${options.username}`);

    } finally {
        await browser.close();
    }
}

main().catch(console.error);
