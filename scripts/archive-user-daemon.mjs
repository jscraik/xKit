#!/usr/bin/env node

/**
 * Daemon script to continuously archive tweets from specific users
 * Tracks state to avoid re-archiving the same tweets
 * 
 * Usage:
 *   node scripts/archive-user-daemon.mjs --users @jh3yy,@username2
 *   node scripts/archive-user-daemon.mjs --config archive-config.json
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Archive User Daemon - Continuously archive tweets from specific users

Usage:
  node scripts/archive-user-daemon.mjs [options]

Options:
  --users <list>        Comma-separated list of usernames (e.g., @jh3yy,@username2)
  --config <path>       Path to JSON config file with user list and settings
  --interval <minutes>  Check interval in minutes (default: 60)
  --limit <number>      Tweets to fetch per check (default: 50)
  --help, -h            Show this help message

Config File Format (JSON):
{
  "users": ["jh3yy", "username2"],
  "interval": 60,
  "limit": 50,
  "outputDir": "knowledge/profiles"
}

Examples:
  node scripts/archive-user-daemon.mjs --users @jh3yy
  node scripts/archive-user-daemon.mjs --config archive-config.json
  node scripts/archive-user-daemon.mjs --users @jh3yy,@username2 --interval 30
`);
    process.exit(0);
}

// Parse configuration
let config = {
    users: [],
    interval: 60,
    limit: 50,
    outputDir: 'knowledge/profiles',
};

const configIndex = args.indexOf('--config');
if (configIndex !== -1) {
    const configPath = args[configIndex + 1];
    if (!existsSync(configPath)) {
        console.error(`Error: Config file not found: ${configPath}`);
        process.exit(1);
    }
    const fileConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    config = { ...config, ...fileConfig };
}

const usersIndex = args.indexOf('--users');
if (usersIndex !== -1) {
    const usersList = args[usersIndex + 1];
    config.users = usersList.split(',').map(u => u.trim().replace('@', ''));
}

const intervalIndex = args.indexOf('--interval');
if (intervalIndex !== -1) {
    config.interval = parseInt(args[intervalIndex + 1], 10);
}

const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1) {
    config.limit = parseInt(args[limitIndex + 1], 10);
}

if (config.users.length === 0) {
    console.error('Error: No users specified. Use --users or --config.');
    process.exit(1);
}

// Create output directory
if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
}

// State file to track last archived tweet IDs
const stateFile = join(config.outputDir, '.archive-state.json');
let state = {};
if (existsSync(stateFile)) {
    state = JSON.parse(readFileSync(stateFile, 'utf-8'));
}

/**
 * Archive tweets for a single user
 */
async function archiveUser(username) {
    console.log(`\n📥 Checking @${username}...`);

    try {
        const query = `from:${username}`;
        const args = ['xkit', 'search', query, '--count', String(config.limit), '--json'];

        const output = execFileSync('pnpm', args, {
            encoding: 'utf-8',
            stdio: ['inherit', 'pipe', 'inherit'],
            maxBuffer: 10 * 1024 * 1024,
        });

        const tweets = JSON.parse(output);

        if (!Array.isArray(tweets) || tweets.length === 0) {
            console.log(`   No new tweets found`);
            return;
        }

        // Filter out already archived tweets
        const lastArchivedId = state[username]?.lastTweetId;
        const newTweets = lastArchivedId
            ? tweets.filter(t => t.id > lastArchivedId)
            : tweets;

        if (newTweets.length === 0) {
            console.log(`   No new tweets since last archive`);
            return;
        }

        console.log(`   Found ${newTweets.length} new tweets`);

        // Generate markdown output
        const timestamp = new Date().toISOString();
        const date = timestamp.split('T')[0];
        const userDir = join(config.outputDir, username);

        if (!existsSync(userDir)) {
            mkdirSync(userDir, { recursive: true });
        }

        // Append to daily file
        const dailyFile = join(userDir, `${date}.md`);
        const isNewFile = !existsSync(dailyFile);

        let content = '';
        if (isNewFile) {
            content += `# @${username} - ${date}\n\n`;
            content += `**Profile:** https://x.com/${username}\n`;
            content += `**Archived:** ${timestamp}\n\n---\n\n`;
        }

        // Add tweets in reverse chronological order
        for (const tweet of newTweets.reverse()) {
            content += `## Tweet ${tweet.id}\n\n`;
            content += `**Posted:** ${tweet.createdAt || 'Unknown'}\n`;
            content += `**Link:** https://x.com/${username}/status/${tweet.id}\n\n`;
            content += `${tweet.text}\n\n`;

            if (tweet.media && tweet.media.length > 0) {
                content += `**Media:**\n`;
                for (const media of tweet.media) {
                    content += `- ${media.type}: ${media.url}\n`;
                }
                content += `\n`;
            }

            content += `---\n\n`;
        }

        // Append to file
        if (isNewFile) {
            writeFileSync(dailyFile, content, 'utf-8');
        } else {
            const existing = readFileSync(dailyFile, 'utf-8');
            writeFileSync(dailyFile, existing + content, 'utf-8');
        }

        // Update state
        state[username] = {
            lastTweetId: tweets[0].id,
            lastCheck: timestamp,
            totalArchived: (state[username]?.totalArchived || 0) + newTweets.length,
        };
        writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf-8');

        console.log(`   ✅ Archived ${newTweets.length} tweets to ${dailyFile}`);

    } catch (error) {
        console.error(`   ❌ Error archiving @${username}:`, error.message);
    }
}

/**
 * Main archive loop
 */
async function runArchiveLoop() {
    console.log(`\n🚀 Starting archive daemon`);
    console.log(`   Users: ${config.users.join(', ')}`);
    console.log(`   Interval: ${config.interval} minutes`);
    console.log(`   Output: ${config.outputDir}`);
    console.log(`\n   Press Ctrl+C to stop\n`);

    while (true) {
        const startTime = Date.now();

        for (const username of config.users) {
            await archiveUser(username);
        }

        const elapsed = Date.now() - startTime;
        const waitTime = (config.interval * 60 * 1000) - elapsed;

        if (waitTime > 0) {
            const nextCheck = new Date(Date.now() + waitTime);
            console.log(`\n⏰ Next check at ${nextCheck.toLocaleTimeString()}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down archive daemon...');
    process.exit(0);
});

// Start the daemon
runArchiveLoop().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
