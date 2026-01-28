#!/usr/bin/env node

/**
 * Extract ALL tweets from a user profile for specified years
 * 
 * Uses cursor-based pagination to fetch up to Twitter's limit (~3200 tweets)
 * and organizes them by year.
 * 
 * Usage:
 *   node scripts/extract-all-tweets.mjs @jh3yy
 *   node scripts/extract-all-tweets.mjs jh3yy --years 2024,2025,2026
 *   node scripts/extract-all-tweets.mjs @jh3yy --output-dir ./archives --format markdown
 */

import { resolveCredentials, TwitterClient } from '../dist/lib/index.js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Extract All Tweets - Archive all available user tweets organized by year

Usage:
  node scripts/extract-all-tweets.mjs <username> [options]

Arguments:
  username              Twitter/X username (with or without @)

Options:
  --years <list>        Comma-separated years to extract (default: 2024,2025,2026)
  --output-dir <path>   Custom output directory (default: knowledge/by-year/<username>)
  --format <type>       Output format: json or markdown (default: json)
  --resume              Resume from previous extraction using saved cursor
  --help, -h            Show this help message

Examples:
  # Extract all 2024-2026 tweets
  node scripts/extract-all-tweets.mjs @jenny_wen

  # Extract to custom directory in markdown format
  node scripts/extract-all-tweets.mjs @jenny_wen --format markdown --output-dir ./archives

  # Resume interrupted extraction
  node scripts/extract-all-tweets.mjs @jenny_wen --resume
`);
    process.exit(0);
}

// Parse arguments
const username = args[0].replace('@', '');
const yearsIndex = args.indexOf('--years');
const years = yearsIndex !== -1
    ? args[yearsIndex + 1].split(',').map(y => parseInt(y.trim()))
    : [2024, 2025, 2026];
const outputDirIndex = args.indexOf('--output-dir');
const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : null;
const formatIndex = args.indexOf('--format');
const format = formatIndex !== -1 ? args[formatIndex + 1] : 'json';
const resumeFlag = args.includes('--resume');

// Validate inputs
if (!['json', 'markdown'].includes(format)) {
    console.error(`Error: Invalid format "${format}". Must be "json" or "markdown".`);
    process.exit(1);
}

const baseDir = outputDir || join('knowledge', 'by-year', username);
const stateFile = join(baseDir, '.extraction-state.json');

console.log(`\n📥 Extracting all tweets from @${username}...`);
console.log(`   Years: ${years.join(', ')}`);
console.log(`   Format: ${format}`);
console.log(`   Output: ${baseDir}\n`);

// Create output directory
if (!existsSync(baseDir)) {
    mkdirSync(baseDir, { recursive: true });
    console.log(`📁 Created directory: ${baseDir}\n`);
}

async function extractAllTweets() {
    const { cookies, warnings } = await resolveCredentials({ cookieSource: 'safari' });

    for (const warning of warnings) {
        console.warn(`⚠️  ${warning}`);
    }

    if (!cookies.authToken || !cookies.ct0) {
        throw new Error('Missing required credentials');
    }

    const client = new TwitterClient({ cookies });
    const allTweets = [];
    
    // Load state if resuming
    let cursor = undefined;
    let pagesFetched = 0;
    if (resumeFlag && existsSync(stateFile)) {
        const state = JSON.parse(readFileSync(stateFile, 'utf8'));
        cursor = state.cursor;
        pagesFetched = state.pagesFetched || 0;
        console.log(`🔄 Resuming from page ${pagesFetched}${cursor ? ' (with cursor)' : ''}\n`);
    }

    console.log(`📥 Fetching tweets (up to ~3200 max)...`);
    
    // Fetch in batches until we get all tweets or hit rate limit
    const batchSize = 200;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    
    while (consecutiveErrors < maxConsecutiveErrors) {
        try {
            const result = await client.getUserTweets(username, batchSize, { 
                includeRaw: false,
                cursor 
            });

            if (!result.success || !result.tweets) {
                if (result.error?.includes('Rate limited')) {
                    console.log(`\n⏳ Rate limited. Saving state for resume...`);
                    writeFileSync(stateFile, JSON.stringify({
                        cursor,
                        pagesFetched,
                        lastFetch: new Date().toISOString()
                    }, null, 2));
                    console.log(`💾 State saved to: ${stateFile}`);
                    console.log(`\n💡 To resume later, run:`);
                    console.log(`   node scripts/extract-all-tweets.mjs @${username} --resume`);
                    break;
                }
                throw new Error(result.error || 'Failed to fetch tweets');
            }

            if (result.tweets.length === 0) {
                console.log(`\n✅ No more tweets available.`);
                break;
            }

            allTweets.push(...result.tweets);
            cursor = result.lastCursor;
            pagesFetched++;
            consecutiveErrors = 0;

            console.log(`   Page ${pagesFetched}: +${result.tweets.length} tweets (total: ${allTweets.length})`);

            // Stop if no more cursor
            if (!cursor) {
                console.log(`\n✅ Reached end of timeline.`);
                break;
            }

            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            consecutiveErrors++;
            console.error(`   ❌ Error (${consecutiveErrors}/${maxConsecutiveErrors}): ${error.message}`);
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
                console.log(`\n⏳ Too many errors. Saving state for resume...`);
                writeFileSync(stateFile, JSON.stringify({
                    cursor,
                    pagesFetched,
                    lastFetch: new Date().toISOString(),
                    error: error.message
                }, null, 2));
                console.log(`💾 State saved to: ${stateFile}`);
                console.log(`\n💡 To resume later, run:`);
                console.log(`   node scripts/extract-all-tweets.mjs @${username} --resume`);
                break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    console.log(`\n📊 Total tweets fetched: ${allTweets.length}`);
    
    // Filter by year
    const results = {};
    for (const year of years) {
        results[year] = allTweets.filter(tweet => {
            if (!tweet.createdAt) return false;
            const tweetYear = new Date(tweet.createdAt).getFullYear();
            return tweetYear === year;
        });
        console.log(`   📅 ${year}: ${results[year].length} tweets`);
    }

    return results;
}

async function formatTweetMarkdown(tweet, index) {
    const date = new Date(tweet.createdAt).toLocaleString();
    const url = tweet.url || `https://x.com/${username}/status/${tweet.id}`;
    const text = tweet.text || '';
    const media = tweet.media?.length ? tweet.media.map(m => m.url || m.previewUrl).join(' ') : '';

    return `
### Tweet #${index + 1} - ${date}

**URL:** ${url}
**Author:** @${tweet.author?.username || username}

${text ? text + '\n' : ''}${media ? `
**Media:**
${media}
` : ''}
---
`;
}

async function saveResults(results) {
    console.log(`\n💾 Saving results to: ${baseDir}`);
    const timestamp = new Date().toISOString().split('T')[0];
    
    for (const year of years) {
        const tweets = results[year];
        
        if (format === 'json') {
            const filename = `${username}-${year}-${timestamp}.json`;
            const filepath = join(baseDir, filename);
            writeFileSync(filepath, JSON.stringify(tweets, null, 2), 'utf-8');
            console.log(`   💾 Saved: ${filepath} (${tweets.length} tweets)`);
        } else {
            const filename = `${username}-${year}-${timestamp}.md`;
            const filepath = join(baseDir, filename);

            const header = `# @${username} - ${year} Tweet Archive

**Archived:** ${new Date().toISOString()}
**Tweet Count:** ${tweets.length}
**Source:** https://x.com/${username}

---

`;

            const content = header + tweets.map((t, i) => formatTweetMarkdown(t, i)).join('\n');
            writeFileSync(filepath, content, 'utf-8');
            console.log(`   💾 Saved: ${filepath} (${tweets.length} tweets)`);
        }
    }

    // Save combined JSON
    const combinedPath = join(baseDir, `${username}-all-years-${timestamp}.json`);
    writeFileSync(combinedPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`   💾 Combined: ${combinedPath}`);
    
    // Clean up state file if successful
    if (existsSync(stateFile)) {
        const state = JSON.parse(readFileSync(stateFile, 'utf8'));
        if (!state.error) {
            // Keep it for reference but mark as complete
            writeFileSync(stateFile, JSON.stringify({
                ...state,
                completed: true,
                completedAt: new Date().toISOString()
            }, null, 2));
            console.log(`   📝 State file updated: ${stateFile}`);
        }
    }
}

async function main() {
    try {
        const results = await extractAllTweets();
        await saveResults(results);

        console.log('\n✅ Extraction complete!');
        const totalTweets = Object.values(results).reduce((sum, tweets) => sum + tweets.length, 0);
        console.log(`   Total tweets extracted: ${totalTweets}`);

    } catch (error) {
        console.error('\n❌ Error:');
        console.error(error.message);
        process.exit(1);
    }
}

main();
