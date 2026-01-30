#!/usr/bin/env node

/**
 * Extract articles from existing profile sweep tweets
 * This script re-fetches tweets with full data to get expanded URLs,
 * then extracts article content from those URLs.
 * 
 * Usage:
 *   node scripts/extract-articles-from-sweep.mjs <username>
 *   node scripts/extract-articles-from-sweep.mjs emilkowalski
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ArticleExtractor } from '../dist/bookmark-enrichment/article-extractor.js';
import { UrlExpander } from '../dist/bookmark-enrichment/url-expander.js';
import { detectLinkType } from '../dist/content-extraction/link-detector.js';
import { TwitterClient } from '../dist/lib/twitter-client.js';

const username = process.argv[2];

if (!username) {
    console.error('Usage: node scripts/extract-articles-from-sweep.mjs <username>');
    process.exit(1);
}

const artifactsDir = join(process.cwd(), 'artifacts', username);

console.log(`📰 Extracting articles from @${username}'s tweets...`);
console.log(`   Artifacts: ${artifactsDir}\n`);

// Read existing tweets to get count
const tweetsPath = join(artifactsDir, 'tweets.json');
let existingTweets;
try {
    const data = readFileSync(tweetsPath, 'utf8');
    existingTweets = JSON.parse(data);
} catch (error) {
    console.error(`❌ Failed to read existing tweets: ${error.message}`);
    process.exit(1);
}

console.log(`✓ Found ${existingTweets.length} existing tweets`);
console.log(`\n🔄 Re-fetching tweets with full data (including URL entities)...`);

// Get credentials from environment
const authToken = process.env.AUTH_TOKEN;
const ct0 = process.env.CT0;

if (!authToken || !ct0) {
    console.error('❌ Missing credentials. Set AUTH_TOKEN and CT0 environment variables.');
    console.error('   Or run: export AUTH_TOKEN="..." CT0="..."');
    process.exit(1);
}

const client = new TwitterClient({
    cookies: { authToken, ct0 },
    timeoutMs: 30000,
});

// Re-fetch tweets with full data
const result = await client.getUserTweets(username, existingTweets.length, { includeRaw: true });

if (!result.success || !result.tweets) {
    console.error(`❌ Failed to fetch tweets: ${result.error}`);
    process.exit(1);
}

console.log(`✅ Fetched ${result.tweets.length} tweets with full data\n`);

// Extract URLs from tweets
const urlExpander = new UrlExpander();
const articleExtractor = new ArticleExtractor();

const articles = [];
let processed = 0;
let found = 0;
let skipped = 0;

for (const tweet of result.tweets) {
    // Check if tweet has URL entities
    if (!tweet.entities?.urls || tweet.entities.urls.length === 0) {
        continue;
    }

    for (const urlEntity of tweet.entities.urls) {
        const expandedUrl = urlEntity.expanded_url || urlEntity.url;
        processed++;

        // Detect link type
        let linkType;
        try {
            linkType = detectLinkType(expandedUrl);
        } catch (error) {
            console.log(`⏭️  Invalid URL: ${expandedUrl}`);
            skipped++;
            continue;
        }

        // Only process article links
        if (linkType !== 'article') {
            console.log(`⏭️  Skipping ${linkType}: ${expandedUrl}`);
            skipped++;
            continue;
        }

        try {
            console.log(`📄 Extracting: ${expandedUrl}`);

            const expanded = await urlExpander.expand(expandedUrl);
            const content = await articleExtractor.extract(expanded.finalUrl);

            if (content && content.title) {
                found++;
                articles.push({
                    url: expanded.finalUrl,
                    originalUrl: expandedUrl,
                    title: content.title,
                    content: content.content,
                    publishedTime: content.publishedTime,
                    tweetId: tweet.id,
                    tweetText: tweet.text,
                    tweetUrl: `https://x.com/${username}/status/${tweet.id}`,
                    tweetDate: tweet.createdAt,
                });

                console.log(`   ✅ ${content.title}`);
            } else {
                console.log(`   ⚠️  No content extracted`);
            }
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
        }
    }
}

console.log(`\n📊 Summary:`);
console.log(`   URLs processed: ${processed}`);
console.log(`   Articles found: ${found}`);
console.log(`   Skipped: ${skipped}`);

if (articles.length > 0) {
    // Save articles
    const articlesPath = join(artifactsDir, 'articles-extracted.json');
    writeFileSync(articlesPath, JSON.stringify(articles, null, 2), 'utf8');
    console.log(`\n💾 Saved articles to ${articlesPath}`);

    // Generate markdown
    const markdownLines = [];
    markdownLines.push(`# Articles from @${username}`);
    markdownLines.push('');
    markdownLines.push(`**Extracted:** ${new Date().toLocaleString()}`);
    markdownLines.push(`**Total:** ${articles.length} articles`);
    markdownLines.push('');
    markdownLines.push('---');
    markdownLines.push('');

    for (const article of articles) {
        markdownLines.push(`## ${article.title || 'Untitled'}`);
        markdownLines.push('');
        markdownLines.push(`**URL:** ${article.url}`);
        if (article.publishedTime) {
            markdownLines.push(`**Published:** ${article.publishedTime}`);
        }
        markdownLines.push(`**Tweet:** ${article.tweetUrl}`);
        markdownLines.push(`**Tweet Date:** ${article.tweetDate}`);
        markdownLines.push('');
        if (article.content) {
            markdownLines.push(article.content.substring(0, 1000));
            if (article.content.length > 1000) {
                markdownLines.push('...');
            }
        }
        markdownLines.push('');
        markdownLines.push('---');
        markdownLines.push('');
    }

    const markdownPath = join(artifactsDir, 'articles-extracted.md');
    writeFileSync(markdownPath, markdownLines.join('\n'), 'utf8');
    console.log(`💾 Saved markdown to ${markdownPath}`);
} else {
    console.log(`\n⚠️  No articles found`);
}

console.log('\n✨ Done!');
