#!/usr/bin/env ts
/**
 * Simple public API tweets fetcher for testing persona extraction
 * Uses Twitter's nitter instances as a fallback when official API is down
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const USERNAME = process.argv[2] || 'jenny_wen';
const LIMIT = parseInt(process.argv[3] || '50', 10);
const OUTPUT_DIR = process.argv[4] || './artifacts';

interface Tweet {
  id: string;
  text: string;
  createdAt: string;
  authorId: string;
  media?: Array<{
    type: 'photo' | 'video' | 'animated_gif';
    url: string;
    previewUrl: string;
    width?: number;
    height?: number;
    durationMs?: number;
  }>;
}

/**
 * Try multiple nitter instances to fetch user tweets
 */
async function fetchFromNitter(username: string, limit: number): Promise<Tweet[]> {
  const nitterInstances = [
    'https://nitter.net',
    'https://nitter.poast.org',
    'https://nitter.privacydev.net',
    'https://nitter.mint.lgbt',
    'https://nitter.1d4.us',
  ];

  for (const instance of nitterInstances) {
    try {
      console.log(`Trying ${instance}...`);
      const response = await fetch(`${instance}/${username}/rss`);

      if (!response.ok) {
        continue;
      }

      const text = await response.text();
      const tweets = parseNitterRss(text, username);

      if (tweets.length > 0) {
        console.log(`Fetched ${tweets.length} tweets from ${instance}`);
        return tweets.slice(0, limit);
      }
    } catch (error) {
      console.log(`   Failed: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
  }

  throw new Error('All nitter instances failed or returned no tweets');
}

/**
 * Parse nitter RSS feed to extract tweets
 */
function parseNitterRss(rssText: string, username: string): Tweet[] {
  const tweets: Tweet[] = [];

  // Extract items from RSS
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let matchCount = 0;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(rssText)) !== null && matchCount < 1000) {
    matchCount++;
    const item = match[1];

    // Extract tweet text
    const titleMatch = /<title>(.+?)<\/title>/s.exec(item);
    const descriptionMatch = /<description>(.+?)<\/description>/s.exec(item);
    const linkMatch = /<link>(.+?)<\/link>/s.exec(item);
    const pubDateMatch = /<pubDate>(.+?)<\/pubDate>/s.exec(item);

    if (!titleMatch || !descriptionMatch) {
      continue;
    }

    // Extract tweet ID from link
    const tweetIdMatch = /\/status\/(\d+)/.exec(linkMatch?.[1] || '');
    const tweetId = tweetIdMatch ? tweetIdMatch[1] : `nitter_${Date.now()}_${matchCount}`;

    // Decode HTML entities in description (actual tweet content)
    let text = descriptionMatch[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags

    // Extract media if present
    const media: Tweet['media'] = [];
    const mediaExtensions = ['.jpg', '.png', '.gif', '.jpeg', '.webp', '.mp4'];

    // Look for media in description
    for (const ext of mediaExtensions) {
      const mediaMatch = text.match(new RegExp(`(https://[^\\s]+${ext})`, 'i'));
      if (mediaMatch) {
        media.push({
          type: ext === '.mp4' ? 'video' : 'photo',
          url: mediaMatch[1],
          previewUrl: mediaMatch[1],
        });
      }
    }

    tweets.push({
      id: tweetId,
      text: text.trim(),
      createdAt: pubDateMatch?.[1] || new Date().toISOString(),
      authorId: username,
      media: media.length > 0 ? media : undefined,
    });
  }

  return tweets;
}

/**
 * Save tweets to JSON file
 */
function saveTweets(tweets: Tweet[], username: string): string {
  const outputDir = join(process.cwd(), OUTPUT_DIR, username);
  mkdirSync(outputDir, { recursive: true });

  const tweetsPath = join(outputDir, 'tweets.json');
  writeFileSync(tweetsPath, JSON.stringify(tweets, null, 2), 'utf8');

  return tweetsPath;
}

/**
 * Main execution
 */
async function main() {
  console.log(`Fetching tweets for @${USERNAME} (limit: ${LIMIT})\n`);

  try {
    const tweets = await fetchFromNitter(USERNAME, LIMIT);

    if (tweets.length === 0) {
      console.log('No tweets found');
      return;
    }

    const savedPath = saveTweets(tweets, USERNAME);

    console.log(`\nSaved ${tweets.length} tweets to:`);
    console.log(`   ${savedPath}`);
    console.log(`\nStats:`);
    console.log(`   Total tweets: ${tweets.length}`);
    console.log(`   With media: ${tweets.filter(t => t.media && t.media.length > 0).length}`);
    console.log(`   Without media: ${tweets.filter(t => !t.media || t.media.length === 0).length}`);

    console.log(`\nNext step - Run persona extraction:`);
    console.log(`   xkit persona-extract @${USERNAME} --source ${savedPath} --output ./persona-${USERNAME}.json`);

  } catch (error) {
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
