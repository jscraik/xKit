#!/usr/bin/env node

/**
 * Navigate to a specific tweet URL and scroll to find more tweets
 * This bypasses Twitter's "recent tweets first" scroll limit
 */

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

async function main() {
    const targetTweetId = process.argv[2]; // e.g., 1771294524263784619 (March 2024)
    const username = process.argv[3] || 'jh3yy';
    const maxScrolls = parseInt(process.argv[4] || '50');

    if (!targetTweetId) {
        console.log(`
Usage: node scripts/navigate-and-scroll.mjs <tweetId> [username] [maxScrolls]

Example:
  node scripts/navigate-and-scroll.mjs 1771294524263784619 jh3yy 100
`);
        process.exit(0);
    }

    console.log(`🔍 Navigating to tweet: ${targetTweetId}`);
    console.log(`   Looking for @${username} tweets nearby...`);
    console.log(`   Max scrolls: ${maxScrolls}\n`);

    // Get cookies
    const cookies = await import('../dist/lib/cookies.js').then(m => m.resolveCredentials({ cookieSource: ['safari'] }));
    if (!cookies.cookies.authToken || !cookies.cookies.ct0) {
        throw new Error('No cookies found');
    }

    // Setup browser
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
    });

    await context.addCookies([
        {
            name: 'auth_token',
            value: cookies.cookies.authToken!,
            domain: '.x.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax' as const,
        },
        {
            name: 'ct0',
            value: cookies.cookies.ct0!,
            domain: '.x.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax' as const,
        },
    ]);

    const page = await context.newPage();

    try {
        // Navigate to the target tweet
        const url = `https://x.com/${username}/status/${targetTweetId}`;
        console.log(`📍 Opening: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000);

        const foundIds = new Set<string>();
        let scrollCount = 0;

        console.log(`\n📜 Scrolling...`);

        while (scrollCount < maxScrolls) {
            // Extract tweet IDs from current view
            const tweets = await page.evaluate(() => {
                const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
                return Array.from(tweetElements).map(el => {
                    const link = el.querySelector('a[href*="/status/"]');
                    const author = el.querySelector('[data-testid="User-Name"]');
                    return {
                        id: link?.getAttribute('href')?.split('/status/')[1]?.split('?')[0] || '',
                        author: author?.textContent || ''
                    };
                });
            });

            for (const tweet of tweets) {
                if (tweet.id && tweet.author === `@${username}`) {
                    foundIds.add(tweet.id);
                }
            }

            console.log(`   Scroll ${scrollCount + 1}: Found ${foundIds.size} @${username} tweets so far`);

            // Scroll down
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight * 0.8);
            });
            await page.waitForTimeout(2000);

            scrollCount++;
        }

        console.log(`\n✅ Found ${foundIds.size} unique @${username} tweets`);
        console.log(`\nTweet IDs:`);
        Array.from(foundIds).forEach(id => console.log(`   ${id}`));

    } finally {
        await browser.close();
    }
}

main().catch(console.error);
