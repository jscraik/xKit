#!/usr/bin/env node

/**
 * Export bookmarks and organize by year
 *
 * This script:
 * 1. Fetches all bookmarks via xKit
 * 2. Filters by username (optional)
 * 3. Organizes by year
 * 4. Saves to JSON/Markdown files
 *
 * Usage:
 *   node scripts/export-bookmarks-by-year.mjs
 *   node scripts/export-bookmarks-by-year.mjs --filter-by jh3yy
 *   node scripts/export-bookmarks-by-year.mjs --format markdown
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Export Bookmarks by Year - Organize bookmarks from xKit

Usage:
  node scripts/export-bookmarks-by-year.mjs [options]

Options:
  --filter-by <username>  Only include bookmarks from this user
  --format <type>         Output format: json or markdown (default: json)
  --output-dir <path>     Custom output directory (default: knowledge/bookmarks-by-year)
  --years <list>          Comma-separated years to include (default: all)
  --help, -h              Show this help message

Examples:
  # Export all bookmarks organized by year
  node scripts/export-bookmarks-by-year.mjs

  # Export only @jh3yy's bookmarks
  node scripts/export-bookmarks-by-year.mjs --filter-by jh3yy

  # Export as markdown with custom output
  node scripts/export-bookmarks-by-year.mjs --filter-by jh3yy --format markdown --output-dir ./archives

Notes:
  - Requires xKit to be installed and authenticated
  - Run "pnpm run xkit check" to verify authentication first
  - Use auto-bookmark-profile.ts first to bookmark tweets from a user
`);
    process.exit(0);
}

// Parse arguments
const filterByIndex = args.indexOf('--filter-by');
const filterBy = filterByIndex !== -1 ? args[filterByIndex + 1].replace('@', '') : null;

const formatIndex = args.indexOf('--format');
const format = formatIndex !== -1 ? args[formatIndex + 1] : 'json';

const outputDirIndex = args.indexOf('--output-dir');
const outputDir = outputDirIndex !== -1 ? args[outputDirIndex + 1] : null;

const yearsIndex = args.indexOf('--years');
const yearsArg = yearsIndex !== -1 ? args[yearsIndex + 1] : null;
const years = yearsArg ? yearsArg.split(',').map(y => parseInt(y.trim())) : null;

// Validate format
if (!['json', 'markdown'].includes(format)) {
    console.error(`Error: Invalid format "${format}". Must be "json" or "markdown".`);
    process.exit(1);
}

console.log(`\n📦 Exporting bookmarks...`);
console.log(`   Filter by: ${filterBy ? `@${filterBy}` : 'all users'}`);
console.log(`   Format: ${format}`);
console.log(`   Years: ${years ? years.join(', ') : 'all'}\n`);

async function fetchBookmarks() {
    /** Fetch all bookmarks using xKit */
    try {
        console.log(`📥 Fetching bookmarks via xKit...`);
        // SECURITY: Using execFileSync to prevent command injection
        const output = execFileSync('pnpm', ['run', 'xkit', 'bookmarks', '--all', '--json'], {
            encoding: 'utf-8',
            stdio: ['inherit', 'pipe', 'inherit'],
            maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        });

        // Find the start of JSON (after any warnings/logs)
        const jsonStart = output.indexOf('{');
        if (jsonStart === -1) {
            throw new Error('No JSON found in output');
        }
        const jsonOnly = output.slice(jsonStart);

        const data = JSON.parse(jsonOnly);
        // xKit returns { tweets: [...] } - extract the array
        const bookmarks = data.tweets || data;
        console.log(`   ✅ Fetched ${bookmarks.length} bookmarks`);
        return bookmarks;
    } catch (error) {
        throw new Error(`Failed to fetch bookmarks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function filterBookmarks(bookmarks, username, years) {
    /** Filter bookmarks by username (tweet author) and/or years */
    let filtered = bookmarks;

    if (username) {
        filtered = filtered.filter(b => {
            // Only include tweets WHERE the author is the specified username
            // This excludes replies/mentions from others
            // Handle both field names used by xKit
            const author = b.author?.username || b.user?.username || b.author?.screen_name || '';
            return author.toLowerCase() === username.toLowerCase();
        });
        console.log(`🔍 Filtered to @${username}'s own tweets: ${filtered.length} bookmarks`);
    }

    if (years) {
        filtered = filtered.filter(b => {
            const year = new Date(b.createdAt || b.created_at).getFullYear();
            return years.includes(year);
        });
        console.log(`🔍 Filtered to years ${years.join(', ')}: ${filtered.length} bookmarks`);
    }

    return filtered;
}

function organizeByYear(bookmarks) {
    /** Organize bookmarks by year */
    const byYear = {};

    for (const bookmark of bookmarks) {
        const date = new Date(bookmark.createdAt || bookmark.created_at);
        const year = date.getFullYear();

        if (!byYear[year]) {
            byYear[year] = [];
        }
        byYear[year].push(bookmark);
    }

    return byYear;
}

function formatTweetMarkdown(tweet, index) {
    /** Format a tweet as markdown */
    const date = new Date(tweet.createdAt || tweet.created_at).toLocaleString();
    const username = tweet.author?.username || tweet.user?.username || tweet.author?.screen_name || 'unknown';
    const url = tweet.url || `https://x.com/${username}/status/${tweet.id}`;
    const text = tweet.text || tweet.full_text || '';
    const media = tweet.media?.length
        ? tweet.media.map(m => m.url || m.media_url_https || m.previewUrl).join(' ')
        : '';

    return `
### Tweet #${index + 1} - ${date}

**URL:** ${url}
**Author:** @${username}
**ID:** ${tweet.id}

${text ? text + '\n' : ''}${media ? `
**Media:**
${media}
` : ''}
---
`;
}

async function saveResults(byYear, baseDir, format) {
    /** Save results to files */
    const timestamp = new Date().toISOString().split('T')[0];

    // Create output directory
    if (!existsSync(baseDir)) {
        mkdirSync(baseDir, { recursive: true });
    }

    const years = Object.keys(byYear).sort().reverse();
    let totalCount = 0;

    for (const year of years) {
        const tweets = byYear[year];
        totalCount += tweets.length;

        if (format === 'json') {
            const filename = `bookmarks-${year}-${timestamp}.json`;
            const filepath = join(baseDir, filename);
            writeFileSync(filepath, JSON.stringify(tweets, null, 2), 'utf-8');
            console.log(`   💾 ${year}: ${filepath} (${tweets.length} tweets)`);
        } else {
            const filename = `bookmarks-${year}-${timestamp}.md`;
            const filepath = join(baseDir, filename);

            const header = `# Bookmarks - ${year}

**Archived:** ${new Date().toISOString()}
**Tweet Count:** ${tweets.length}
**Source:** Twitter/X Bookmarks

---

`;

            const content = header + tweets.map((t, i) => formatTweetMarkdown(t, i)).join('\n');
            writeFileSync(filepath, content, 'utf-8');
            console.log(`   💾 ${year}: ${filepath} (${tweets.length} tweets)`);
        }
    }

    // Save combined file
    const combinedFilename = `bookmarks-all-years-${timestamp}.${format === 'json' ? 'json' : 'md'}`;
    const combinedPath = join(baseDir, combinedFilename);

    if (format === 'json') {
        writeFileSync(combinedPath, JSON.stringify(byYear, null, 2), 'utf-8');
    } else {
        const header = `# All Bookmarks by Year

**Archived:** ${new Date().toISOString()}
**Total Tweets:** ${totalCount}
**Source:** Twitter/X Bookmarks

---

`;
        const content = header + Object.entries(byYear)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([year, tweets]) => {
                let section = `\n## ${year} (${tweets.length} tweets)\n\n`;
                section += tweets.map((t, i) => formatTweetMarkdown(t, i)).join('\n');
                return section;
            })
            .join('\n');
        writeFileSync(combinedPath, content, 'utf-8');
    }

    console.log(`   💾 Combined: ${combinedPath}`);

    return { years, totalCount };
}

async function main() {
    try {
        // Fetch bookmarks
        const bookmarks = await fetchBookmarks();

        // Filter bookmarks
        const filtered = filterBookmarks(bookmarks, filterBy, years);

        if (filtered.length === 0) {
            console.log(`\n⚠️  No bookmarks found matching criteria.`);
            return;
        }

        // Organize by year
        const byYear = organizeByYear(filtered);
        console.log(`\n📅 Found tweets in ${Object.keys(byYear).length} years:`);
        Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0])).forEach(([year, tweets]) => {
            console.log(`   ${year}: ${tweets.length} tweets`);
        });

        // Save results
        const baseDir = outputDir || join('knowledge', 'bookmarks-by-year');
        console.log(`\n💾 Saving to: ${baseDir}`);
        const result = await saveResults(byYear, baseDir, format);

        console.log(`\n✅ Export complete!`);
        console.log(`   Years: ${result.years.join(', ')}`);
        console.log(`   Total tweets: ${result.totalCount}`);

    } catch (error) {
        console.error(`\n❌ Error:`);
        console.error(error.message);
        process.exit(1);
    }
}

main();
