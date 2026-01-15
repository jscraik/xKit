/**
 * Adapters for converting between different bookmark formats
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';
import type { TweetData } from '../lib/twitter-client-types.js';

/**
 * Convert TweetData to BookmarkRecord format
 */
export function tweetDataToBookmarkRecord(tweet: TweetData): BookmarkRecord {
  return {
    id: tweet.id,
    url: `https://x.com/${tweet.author.username}/status/${tweet.id}`,
    text: tweet.text,
    authorUsername: tweet.author.username,
    authorName: tweet.author.name,
    createdAt: tweet.createdAt || new Date().toISOString(),
    likeCount: tweet.likeCount || 0,
    retweetCount: tweet.retweetCount || 0,
    replyCount: tweet.replyCount || 0,
  };
}

/**
 * Convert multiple TweetData to BookmarkRecord format
 */
export function tweetDataBatchToBookmarkRecords(tweets: TweetData[]): BookmarkRecord[] {
  return tweets.map(tweetDataToBookmarkRecord);
}
