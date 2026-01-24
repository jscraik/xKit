#!/usr/bin/env node

/**
 * Archive tweets from a specific user profile to the knowledge base
 * 
 * Usage:
 *   node scripts/archive-user-profile.mjs @jh3yy
 *   node scripts/archive-user-profile.mjs @jh3yy --limit 100
 *   node scripts/archive-user-profile.mjs @jh3yy --format json
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
Archive User Profile - Extract tweets from a specific user

Usage:
  node scripts/archive-user-profile.mjs <username> [options]

Arguments:
  username              Twitter/X username (with or without @)

Options:
  --limit <number>      Number of tweets to fetch (default: 200)
  --all                 Fetch all available tweets (up to ~3200, Twitter's limit)
  --format <type>       Output format: markdown or json (default: markdown)
  --output <path>       Custom output path (default: knowledge/<username>-archive-<date>.md)
  --help, -h            Show this help message

Examples:
  node scripts/archive-user-profile.mjs @jh3yy
  node scripts/archive-user-profile.mjs jh3yy --limit 500
  node scripts/archive-user-profile.mjs @jh3yy --all
  node scripts/archive-user-profile.mjs @jh3yy --format json
  node scripts/archive-user-profile.mjs @jh3yy --output custom/path.md
`);
    process.exit(0);
}

// Parse arguments
const username = args[0].replace('@', '');
const limitIndex = args.indexOf('--limit');
const limit = limitIndex !== -1 ? args[limitIndex + 1] : '200';
const formatIndex = args.indexOf('--format');
const format = formatIndex !== -1 ? args[formatIndex + 1] : 'markdown';
const outputIndex = args.indexOf('--output');
const customOutput = outputIndex !== -1 ? args[outputIndex + 1] : null;
const allFlag = args.includes('--all');

// If --all is specified, set limit to maximum (Twitter's ~3200 tweet limit)
const effectiveLimit = allFlag ? '3200' : limit;

// Validate format
if (!['markdown', 'json'].includes(format)) {
    console.error(`Error: Invalid format "${format}". Must be "markdown" or "json".`);
    process.exit(1);
}

// Create knowledge directory if it doesn't exist
const knowledgeDir = 'knowledge';
if (!existsSync(knowledgeDir)) {
    mkdirSync(knowledgeDir, { recursive: true });
}

// Generate output filename
const timestamp = new Date().toISOString().split('T')[0];
const defaultFilename = format === 'json'
    ? `${username}-archive-${timestamp}.json`
    : `${username}-archive-${timestamp}.md`;
const outputPath = customOutput || join(knowledgeDir, defaultFilename);

console.log(`\n📥 Archiving tweets from @${username}...`);
console.log(`   Limit: ${allFlag ? 'ALL (up to ~3200)' : effectiveLimit} tweets`);
console.log(`   Format: ${format}`);
console.log(`   Output: ${outputPath}\n`);

try {
    // Build xKit command using the new user-timeline command
    const xkitCmd = format === 'json'
        ? `pnpm xkit user-timeline "${username}" --count ${effectiveLimit} --json`
        : `pnpm xkit user-timeline "${username}" --count ${effectiveLimit}`;

    console.log(`Running: ${xkitCmd}\n`);

    // Execute xKit command
    const output = execSync(xkitCmd, {
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'inherit'],
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
    });

    if (format === 'json') {
        // Save JSON output directly
        writeFileSync(outputPath, output, 'utf-8');
    } else {
        // For markdown, add a header and metadata
        const header = `# @${username} Tweet Archive

**Archived:** ${new Date().toISOString()}
**Tweet Count:** ${limit} (max)
**Source:** https://x.com/${username}

---

`;
        writeFileSync(outputPath, header + output, 'utf-8');
    }

    console.log(`\n✅ Successfully archived to: ${outputPath}`);

    // Show file size
    const stats = readFileSync(outputPath, 'utf-8');
    const lines = stats.split('\n').length;
    const size = (Buffer.byteLength(stats, 'utf-8') / 1024).toFixed(2);
    console.log(`   File size: ${size} KB`);
    console.log(`   Lines: ${lines}`);

} catch (error) {
    console.error('\n❌ Error archiving tweets:');
    console.error(error.message);
    process.exit(1);
}
