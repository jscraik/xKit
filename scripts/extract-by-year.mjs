#!/usr/bin/env node

/**
 * Extract tweets from a user profile and organize by year
 *
 * Uses xKit's GraphQL client to fetch all available tweets,
 * then filters and organizes them by year.
 *
 * Usage:
 *   node scripts/extract-by-year.mjs @jh3yy
 *   node scripts/extract-by-year.mjs jh3yy --years 2024,2025,2026
 *   node scripts/extract-by-year.mjs @jh3yy --all --output-dir ./archives
 */

import { resolveCredentials, TwitterClient } from '../dist/lib/index.js';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Extract by Year - Archive user tweets organized by year

Usage:
  node scripts/extract-by-year.mjs <username> [options]

Arguments:
  username              Twitter/X username (with or without @)

Options:
  --years <list>        Comma-separated years to extract (default: 2024,2025,2026)
  --all                 Fetch all available tweets (up to ~3200, Twitter's limit)
  --limit <number>      Max tweets per year when using search (default: 200)
  --output-dir <path>   Custom output directory (default: knowledge/by-year/<username>)
  --format <type>       Output format: json or markdown (default: json)
  --method <type>       Extraction method: timeline (all, filter locally) or search (per-year)
  --help, -h            Show this help message

Examples:
  # Extract 2024-2026 using timeline method (fetch all, filter locally)
  node scripts/extract-by-year.mjs @jh3yy --years 2024,2025,2026

  # Extract specific years using search method (date-filtered queries)
  node scripts/extract-by-year.mjs @jh3yy --method search --years 2024

  # Extract all years to custom directory
  node scripts/extract-by-year.mjs @jh3yy --all --output-dir ./archives

Notes:
  - 'timeline' method: Fetches all tweets (~3200 max), filters by date locally
  - 'search' method: Uses date-filtered search queries (200 tweets per year limit)
  - For complete archives, use 'timeline' method with --all
`);
    process.exit(0);
}

// Parse arguments
const username = args[0].replace('@', '');
const yearsIndex = args.indexOf('--years');
const years = yearsIndex !== -1
    ? args[yearsIndex + 1].split(',').map(y => parseInt(y.trim()))
    : [2024, 2025, 2026];
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1]) : 200;
const outputDirIndex = args.indexOf('--output-dir');
const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : null;
const formatIndex = args.indexOf('--format');
const format = formatIndex !== -1 ? args[formatIndex + 1] : 'json';
const methodIndex = args.indexOf('--method');
const method = methodIndex !== -1 ? args[methodIndex + 1] : 'timeline';
const allFlag = args.includes('--all');

// Validate inputs
if (!['json', 'markdown'].includes(format)) {
    console.error(`Error: Invalid format "${format}". Must be "json" or "markdown".`);
    process.exit(1);
}

if (!['timeline', 'search'].includes(method)) {
    console.error(`Error: Invalid method "${method}". Must be "timeline" or "search".`);
    process.exit(1);
}

console.log(`\n📥 Extracting tweets from @${username}...`);
console.log(`   Years: ${years.join(', ')}`);
console.log(`   Method: ${method}`);
console.log(`   Format: ${format}\n`);

async function extractBySearch() {
    /** Use date-filtered search queries */
    const { cookies, warnings } = await resolveCredentials({ cookieSource: 'safari' });

    for (const warning of warnings) {
        console.warn(`⚠️  ${warning}`);
    }

    if (!cookies.authToken || !cookies.ct0) {
        throw new Error('Missing required credentials');
    }

    const client = new TwitterClient({ cookies });
    const results = {};

    for (const year of years) {
        console.log(`\n📅 Fetching ${year}...`);

        const query = `from:${username} since:${year}-01-01 until:${year}-12-31`;
        const result = await client.search(query, limit, { includeRaw: false });

        if (result.success && result.tweets) {
            results[year] = result.tweets;
            console.log(`   ✅ Found ${result.tweets.length} tweets`);
        } else {
            console.warn(`   ⚠️  No tweets found or error: ${result.error}`);
            results[year] = [];
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
}

async function extractByTimeline() {
    /** Fetch all tweets, filter by year locally */
    const { cookies, warnings } = await resolveCredentials({ cookieSource: 'safari' });

    for (const warning of warnings) {
        console.warn(`⚠️  ${warning}`);
    }

    if (!cookies.authToken || !cookies.ct0) {
        throw new Error('Missing required credentials');
    }

    const client = new TwitterClient({ cookies });
    const count = allFlag ? 3200 : Math.min(limit * years.length, 3200);

    console.log(`\n📥 Fetching timeline (up to ${count} tweets)...`);
    const result = await client.getUserTweets(username, count, { includeRaw: false });

    if (!result.success || !result.tweets) {
        throw new Error(result.error || 'Failed to fetch user timeline');
    }

    console.log(`   ✅ Fetched ${result.tweets.length} tweets total`);

    // Filter by year
    const results = {};
    for (const year of years) {
        results[year] = result.tweets.filter(tweet => {
            const tweetYear = new Date(tweet.createdAt).getFullYear();
            return tweetYear === year;
        });
        console.log(`   📅 ${year}: ${results[year].length} tweets`);
    }

    return results;
}

async function formatTweetMarkdown(tweet, index) {
    /** Format a single tweet as markdown */
    const date = new Date(tweet.createdAt).toLocaleString();
    const url = tweet.url || `https://x.com/${username}/status/${tweet.id}`;
    const text = tweet.text || '';
    const media = tweet.media?.length ? tweet.media.map(m => m.url || m.previewUrl).join(' ') : '';

    return `
### Tweet #${index + 1} - ${date}

**URL:** ${url}
**Author:** @${username}

${text ? text + '\n' : ''}${media ? `
**Media:**
${media}
` : ''}
---
`;
}

async function saveResults(results, baseDir) {
    /** Save results to files */
    for (const year of years) {
        const tweets = results[year];
        const timestamp = new Date().toISOString().split('T')[0];

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
    const combinedPath = join(baseDir, `${username}-all-years-${new Date().toISOString().split('T')[0]}.json`);
    writeFileSync(combinedPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`   💾 Combined: ${combinedPath}`);
}

async function main() {
    try {
        // Create output directory
        const timestamp = new Date().toISOString().split('T')[0];
        const baseDir = outputDir || join('knowledge', 'by-year', username);

        if (!existsSync(baseDir)) {
            mkdirSync(baseDir, { recursive: true });
            console.log(`📁 Created directory: ${baseDir}\n`);
        }

        // Extract tweets
        const results = method === 'search'
            ? await extractBySearch()
            : await extractByTimeline();

        // Save results
        console.log(`\n💾 Saving results to: ${baseDir}`);
        await saveResults(results, baseDir);

        console.log('\n✅ Extraction complete!');

        // Summary
        const totalTweets = Object.values(results).reduce((sum, tweets) => sum + tweets.length, 0);
        console.log(`   Total tweets extracted: ${totalTweets}`);

    } catch (error) {
        console.error('\n❌ Error:');
        console.error(error.message);
        process.exit(1);
    }
}

main();
