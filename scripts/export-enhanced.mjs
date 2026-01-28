#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function extractCodeBlocks(text) {
    const blocks = [];
    const markdownRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = markdownRegex.exec(text)) !== null) {
        blocks.push({
            code: match[2].trim(),
            language: match[1] || 'text'
        });
    }
    return blocks;
}

function detectLanguage(code) {
    const lower = code.toLowerCase();
    if (lower.includes('@keyframes') || lower.includes('animation:')) {
        return 'css';
    }
    if (lower.includes('function ') || lower.includes('const ')) {
        return 'javascript';
    }
    return 'text';
}

function formatTweet(tweet, index) {
    const date = new Date(tweet.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const username = tweet.author.username;
    const id = tweet.id;
    const tweetUrl = tweet.url || 'https://x.com/' + username + '/status/' + id;

    let markdown = '## Tweet ' + (index + 1) + ' — ' + date + '\n\n';
    markdown += '**URL:** ' + tweetUrl + '\n';
    markdown += '**Author:** @' + username + '\n\n';

    const codeBlocks = extractCodeBlocks(tweet.text);
    if (codeBlocks.length > 0) {
        markdown += '### 📝 Code\n\n';
        codeBlocks.forEach((block) => {
            const lang = detectLanguage(block.code);
            markdown += '```' + lang + '\n' + block.code + '\n```\n\n';
        });
    }

    markdown += '### 💬 Tweet Text\n\n' + tweet.text + '\n\n';

    if (tweet.media && tweet.media.length > 0) {
        markdown += '### 🖼️ Media\n\n';
        tweet.media.forEach((media, i) => {
            markdown += '<img src="' + media.url + '" alt="Media ' + (i + 1) + '" />\n\n';
        });
    }

    markdown += '---\n\n';
    return markdown;
}

async function main() {
    const username = 'jh3yy';
    const years = [2024, 2025, 2026];

    console.log('\n📦 Enhanced Export for @' + username);
    console.log('═'.repeat(50));

    console.log('\n📥 Fetching bookmarks...');
    const output = execFileSync('pnpm', ['run', 'xkit', 'bookmarks', '--all', '--json'], {
        encoding: 'utf-8',
        stdio: ['inherit', 'pipe', 'inherit'],
        maxBuffer: 50 * 1024 * 1024,
    });

    const jsonStart = output.indexOf('{');
    const data = JSON.parse(output.slice(jsonStart));
    const allTweets = data.tweets || data;

    const filtered = allTweets.filter((tweet) => {
        const isJh3yy = tweet.author?.username === username;
        const tweetYear = new Date(tweet.createdAt).getFullYear();
        return isJh3yy && years.includes(tweetYear);
    });

    console.log('   ✅ Found ' + filtered.length + ' tweets');

    const byYear = {};
    filtered.forEach(tweet => {
        const year = new Date(tweet.createdAt).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(tweet);
    });

    const outputDir = 'knowledge/jh3yy-complete';
    if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }

    const sortedYears = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
    for (const year of sortedYears) {
        const tweets = byYear[year];
        const filename = join(outputDir, 'jh3yy-code-effects-' + year + '.md');

        let markdown = '# @' + username + ' Code Effects - ' + year + '\n\n';
        markdown += '**Generated:** ' + new Date().toISOString() + '\n';
        markdown += '**Total Tweets:** ' + tweets.length + '\n';
        markdown += '**Source:** https://x.com/' + username + '\n\n';
        markdown += '---\n\n';

        tweets.forEach((tweet, i) => {
            markdown += formatTweet(tweet, i);
        });

        writeFileSync(filename, markdown, 'utf-8');
        console.log('   💾 ' + year + ': ' + filename + ' (' + tweets.length + ' tweets)');
    }

    const combinedFile = join(outputDir, 'jh3yy-code-effects-all-years.md');
    let combinedMarkdown = '# @' + username + ' Code Effects - All Years\n\n';
    combinedMarkdown += '**Generated:** ' + new Date().toISOString() + '\n';
    combinedMarkdown += '**Total Tweets:** ' + filtered.length + '\n';
    combinedMarkdown += '**Source:** https://x.com/' + username + '\n\n';
    combinedMarkdown += '---\n\n';

    for (const year of sortedYears) {
        const tweets = byYear[year];
        combinedMarkdown += '## ' + year + ' (' + tweets.length + ' tweets)\n\n';
        tweets.forEach((tweet, i) => {
            combinedMarkdown += formatTweet(tweet, i);
        });
    }

    writeFileSync(combinedFile, combinedMarkdown, 'utf-8');
    console.log('   💾 Combined: ' + combinedFile);

    console.log('\n✅ Export complete!');
    console.log('\nFiles created in ' + outputDir + '/:');
}

main().catch(console.error);
