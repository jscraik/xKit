# xKit API Reference

**Last updated:** 2026-01-20

Complete API reference for using `@brainwav/xkit` as a library in TypeScript/JavaScript projects.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core API](#core-api)
- [Bookmark Modules](#bookmark-modules)
- [Types](#types)
- [Examples](#examples)
- [Error Handling](#error-handling)

---

## Installation

```bash
npm install @brainwav/xkit
# or
pnpm add @brainwav/xkit
# or
yarn add @brainwav/xkit
```

**Requirements:** Node.js >= 22

---

## Quick Start

```typescript
import { TwitterClient, resolveCredentials } from '@brainwav/xkit';

// Resolve credentials (reads from browser cookies or env vars)
const { cookies } = await resolveCredentials({
  cookieSource: 'safari'
});

// Create client
const client = new TwitterClient({ cookies });

// Use the client
const result = await client.search('from:username', 50);
console.log(result.tweets);
```

---

## Core API

### TwitterClient

Main client for interacting with X/Twitter's GraphQL API.

#### Constructor

```typescript
import { TwitterClient } from '@brainwav/xkit';

interface TwitterClientOptions {
  cookies: TwitterCookies;
  timeout?: number;  // Request timeout in milliseconds (default: 20000)
}

const client = new TwitterClient({
  cookies: {
    auth_token: '...',
    ct0: '...'
  },
  timeout: 30000
});
```

#### Methods

##### Search Tweets

```typescript
async search(
  query: string,
  count?: number,
  options?: SearchFetchOptions
): Promise<SearchResult>
```

Search for tweets matching a query.

**Parameters:**
- `query` - Search query (supports X/Twitter search syntax)
- `count` - Number of tweets to fetch (default: 20)
- `options` - Optional fetch options

**Returns:** `SearchResult` with tweets array

```typescript
const result = await client.search('typescript tips', 50);
console.log(result.tweets);  // TweetData[]
console.log(result.nextCursor);  // For pagination
```

##### Get Tweet Details

```typescript
async getTweet(
  tweetId: string,
  options?: TweetFetchOptions
): Promise<GetTweetResult>
```

Fetch a single tweet by ID or URL.

```typescript
const tweet = await client.getTweet('1234567890123456789');
console.log(tweet.tweet);  // TweetData
console.log(tweet.tweet.likes);  // Like count
```

##### Get Thread

```typescript
async getThread(
  tweetId: string,
  options?: TweetFetchOptions
): Promise<TweetData[]>
```

Fetch full conversation thread.

```typescript
const thread = await client.getThread('1234567890123456789');
thread.forEach(tweet => console.log(tweet.text));
```

##### Get Replies

```typescript
async getReplies(
  tweetId: string,
  options?: TweetFetchOptions
): Promise<TweetData[]>
```

Fetch replies to a tweet.

```typescript
const replies = await client.getReplies('1234567890123456789');
```

##### Get Bookmarks

```typescript
async getBookmarks(
  count?: number,
  options?: TimelineFetchOptions
): Promise<{ tweets: TweetData[]; nextCursor?: string }>
```

Fetch authenticated user's bookmarked tweets.

```typescript
const bookmarks = await client.getBookmarks(50);
```

##### Get Likes

```typescript
async getLikes(
  count?: number,
  options?: TimelineFetchOptions
): Promise<{ tweets: TweetData[]; nextCursor?: string }>
```

Fetch authenticated user's liked tweets.

```typescript
const likes = await client.getLikes(50);
```

##### Get News & Trending

```typescript
async getNews(
  count?: number,
  options?: {
    tabs?: ('for_you' | 'trending' | 'news' | 'sports' | 'entertainment')[];
    aiOnly?: boolean;
  }
): Promise<NewsResult[]>
```

Fetch AI-curated news and trending topics.

```typescript
// Fetch from default tabs
const news = await client.getNews(20);

// Fetch from specific tabs
const sportsNews = await client.getNews(10, {
  tabs: ['sports', 'news'],
  aiOnly: true
});
```

##### Get Following

```typescript
async getFollowing(
  userId?: string,
  count?: number
): Promise<TwitterUser[]>
```

Fetch users that the authenticated user (or another user) follows.

```typescript
// Authenticated user's following
const following = await client.getFollowing(undefined, 100);

// Another user's following
const theirFollowing = await client.getFollowing('12345678', 50);
```

##### Get Followers

```typescript
async getFollowers(
  userId?: string,
  count?: number
): Promise<TwitterUser[]>
```

Fetch users who follow the authenticated user (or another user).

```typescript
const followers = await client.getFollowers(undefined, 100);
```

##### Get Lists

```typescript
async getLists(options?: {
  memberOf?: boolean;
}): Promise<ListResult[]>
```

Fetch lists owned by or containing the authenticated user.

```typescript
// Owned lists
const myLists = await client.getLists();

// Lists I'm a member of
const memberLists = await client.getLists({ memberOf: true });
```

##### Get List Timeline

```typescript
async getListTimeline(
  listIdOrUrl: string,
  count?: number
): Promise<{ tweets: TweetData[]; nextCursor?: string }>
```

Fetch tweets from a list timeline.

```typescript
const tweets = await client.getListTimeline('12345678', 50);
```

##### Post Tweet

```typescript
async tweet(
  text: string,
  media?: string[]
): Promise<TweetResult>
```

Post a new tweet (optionally with media attachments).

```typescript
// Simple tweet
const result = await client.tweet('Hello, world!');

// Tweet with media
const withMedia = await client.tweet('Check this out!', [
  '/path/to/image.jpg'
]);
```

##### Reply to Tweet

```typescript
async reply(
  tweetId: string,
  text: string,
  media?: string[]
): Promise<TweetResult>
```

Reply to an existing tweet.

```typescript
const result = await client.reply(
  '1234567890123456789',
  'Great point!'
);
```

##### Unbookmark

```typescript
async unbookmark(tweetId: string): Promise<MutationResult>
```

Remove a bookmark.

```typescript
await client.unbookmark('1234567890123456789');
```

##### Get Current User

```typescript
async whoami(): Promise<CurrentUserResult>
```

Get information about the authenticated user.

```typescript
const me = await client.whoami();
console.log(me.username);  // @handle
console.log(me.userId);    // 1234567890
```

---

### resolveCredentials

Resolve authentication credentials from browser cookies or environment variables.

```typescript
import { resolveCredentials } from '@brainwav/xkit';

interface CredentialsOptions {
  cookieSource?: CookieSource | CookieSource[];
  chromeProfile?: string;
  firefoxProfile?: string;
  cookieTimeout?: number;
}

interface CookieExtractionResult {
  cookies: TwitterCookies;
  source: string;
}

const result = await resolveCredentials({
  cookieSource: ['safari', 'chrome'],
  chromeProfile: 'Default',
  cookieTimeout: 30000
});

console.log(result.cookies.auth_token);
console.log(result.source);  // "safari" or "chrome"
```

**Cookie Sources:** `'safari'` | `'chrome'` | `'firefox'`

**Environment Variables (fallback):**
- `AUTH_TOKEN` or `TWITTER_AUTH_TOKEN`
- `CT0` or `TWITTER_CT0`

---

### Cookie Extraction Functions

Direct cookie extraction for advanced use cases.

```typescript
import {
  extractCookiesFromSafari,
  extractCookiesFromChrome,
  extractCookiesFromFirefox
} from '@brainwav/xkit';

// Safari
const safariCookies = await extractCookiesFromSafari();

// Chrome (with profile)
const chromeCookies = await extractCookiesFromChrome('Default');

// Firefox (with profile)
const firefoxCookies = await extractCookiesFromFirefox('default-release');
```

---

## Bookmark Modules

All bookmark archiving modules are exported from the main package.

### BookmarkEnricher

Enrich bookmarks with expanded URLs and extracted content.

```typescript
import { BookmarkEnricher } from '@brainwav/xkit';

const enricher = new BookmarkEnricher({
  timeout: 10000,
  maxContentSize: 100000
});

const enriched = await enricher.enrich(bookmark);
console.log(enriched.expandedUrls);  // Expanded t.co URLs
console.log(enriched.linkedContent); // Extracted article/repo info
```

### BookmarkCategorizer

Categorize bookmarks by content type.

```typescript
import { BookmarkCategorizer } from '@brainwav/xkit';

const categorizer = new BookmarkCategorizer();
const categorized = categorizer.categorize(enrichedBookmark);

console.log(categorized.category);         // 'github' | 'article' | 'video' | etc
console.log(categorized.categoryAction);   // 'file' | 'capture' | 'transcribe'
console.log(categorized.categoryFolder);   // Target folder path
```

### MarkdownWriter

Write bookmarks as markdown files with frontmatter.

```typescript
import { MarkdownWriter } from '@brainwav/xkit';

const writer = new MarkdownWriter({
  knowledgeDir: './knowledge',
  archiveDir: './archive',
  timezone: 'America/New_York'
});

await writer.write(categorizedBookmarks);
```

### StateManager

Track processed bookmarks for incremental updates.

```typescript
import { StateManager } from '@brainwav/xkit';

const state = new StateManager({
  stateFile: './.xkit/state/bookmarks-state.json'
});

// Filter new bookmarks
const newBookmarks = state.filterNew(allBookmarks);

// Mark as processed
state.markBatchProcessed(newBookmarks.map(b => b.id));
state.save();
```

### SetupWizard

Interactive setup wizard for first-time configuration.

```typescript
import { SetupWizard } from '@brainwav/xkit';

const wizard = new SetupWizard();
const config = await wizard.run();
```

### WebhookNotifier

Send webhook notifications for archive events.

```typescript
import { WebhookNotifier } from '@brainwav/xkit';

const notifier = new WebhookNotifier({
  url: 'https://discord.com/api/webhooks/...',
  type: 'discord'
});

await notifier.notifyStart({ totalBookmarks: 100 });
await notifier.notifySuccess({
  processed: 100,
  duration: 45000
});
await notifier.notifyError({
  error: 'Rate limit exceeded'
});
```

### FolderManager

Manage X/Twitter bookmark folder mapping.

```typescript
import { FolderManager } from '@brainwav/xkit';

const folderManager = new FolderManager({
  folders: {
    '1234567890': 'research',
    '9876543210': 'reading-list'
  }
});

const tag = folderManager.getFolderTag('1234567890');  // 'research'
```

### MediaHandler

Extract and handle media from tweets.

```typescript
import { MediaHandler } from '@brainwav/xkit';

const mediaHandler = new MediaHandler();
const media = mediaHandler.extractMedia(tweet);

console.log(media.photos);   // Photo URLs
console.log(media.videos);   // Video URLs
console.log(media gifs);     // GIF URLs
```

### StatsTracker

Track processing statistics and metrics.

```typescript
import { StatsTracker } from '@brainwav/xkit';

const stats = new StatsTracker();
stats.startTiming('enrichment');

// ... do work ...

stats.endTiming('enrichment');
console.log(stats.getSummary());
```

### BookmarkDaemon

Background daemon for continuous archiving.

```typescript
import { BookmarkDaemon } from '@brainwav/xkit';

const daemon = new BookmarkDaemon({
  interval: 1800000,  // 30 minutes
  command: 'xkit archive'
});

await daemon.start();
// ... runs continuously ...
await daemon.stop();

const status = daemon.getStatus();
console.log(status.running);  // true/false
```

---

## Types

### TweetData

```typescript
interface TweetData {
  id: string;
  text: string;
  author: {
    username: string;
    name: string;
  };
  authorId: string;
  createdAt: string;
  replyCount: number;
  retweetCount: number;
  likeCount: number;
  quoteCount?: number;
  viewCount?: number;
  conversationId: string;
  inReplyToStatusId?: string;
  quotedTweet?: TweetData;
  media?: MediaItem[];
  noteTweet?: NoteTweet;
}
```

### TwitterUser

```typescript
interface TwitterUser {
  id: string;
  username: string;
  name: string;
  description?: string;
  followersCount?: number;
  followingCount?: number;
  isBlueVerified?: boolean;
  profileImageUrl?: string;
  createdAt?: string;
}
```

### SearchResult

```typescript
interface SearchResult {
  tweets: TweetData[];
  nextCursor?: string;
}
```

### NewsResult

```typescript
interface NewsResult {
  id: string;
  headline: string;
  category?: string;
  timeAgo?: string;
  postCount?: number;
  description?: string;
  url?: string;
  tab?: string;
}
```

### TwitterCookies

```typescript
interface TwitterCookies {
  auth_token: string;
  ct0: string;
}
```

---

## Examples

### Complete Archive Workflow

```typescript
import {
  TwitterClient,
  resolveCredentials,
  BookmarkEnricher,
  BookmarkCategorizer,
  MarkdownWriter,
  StateManager
} from '@brainwav/xkit';

// 1. Authenticate
const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
const client = new TwitterClient({ cookies });

// 2. Fetch bookmarks
const { tweets } = await client.getBookmarks(100);

// 3. Convert to bookmark records
const bookmarks = tweets.map(tweet => ({
  id: tweet.id,
  url: `https://x.com/${tweet.author.username}/status/${tweet.id}`,
  text: tweet.text,
  authorUsername: tweet.author.username,
  authorName: tweet.author.name,
  createdAt: tweet.createdAt
}));

// 4. Filter new bookmarks
const state = new StateManager();
const newBookmarks = state.filterNew(bookmarks);

// 5. Enrich with content extraction
const enricher = new BookmarkEnricher();
const enriched = await enricher.enrichBatch(newBookmarks);

// 6. Categorize
const categorizer = new BookmarkCategorizer();
const categorized = categorizer.categorizeBatch(enriched);

// 7. Write markdown
const writer = new MarkdownWriter();
await writer.write(categorized);

// 8. Update state
state.markBatchProcessed(categorized.map(b => b.id));
state.save();
```

### Search and Export

```typescript
import { TwitterClient, resolveCredentials } from '@brainwav/xkit';
import { writeFileSync } from 'fs';

const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
const client = new TwitterClient({ cookies });

const result = await client.search('from:username min_faves:100', 100);

writeFileSync(
  'search-results.json',
  JSON.stringify(result.tweets, null, 2)
);
```

### Monitor Mentions

```typescript
import { TwitterClient, resolveCredentials } from '@brainwav/xkit';

const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
const client = new TwitterClient({ cookies });

// Get mentions for authenticated user
const mentions = await client.getMentions(50);

mentions.forEach(tweet => {
  console.log(`@${tweet.author.username}: ${tweet.text}`);
});
```

---

## Error Handling

### Error Types

```typescript
// Authentication errors
try {
  await client.getTweet('123');
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Authentication failed - check cookies');
  }
}

// Rate limit errors
try {
  await client.search('test', 100);
} catch (error) {
  if (error.message.includes('429')) {
    console.error('Rate limited - wait 15 minutes');
  }
}

// Network errors
try {
  await client.getTweet('123');
} catch (error) {
  if (error.message.includes('ETIMEDOUT')) {
    console.error('Network timeout - check connection');
  }
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;  // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const tweet = await withRetry(() => client.getTweet('123'));
```

---

## See Also

- [LLM Integration Guide](llm-integration.md) - LLM provider setup
- [Custom Templates](CUSTOM_TEMPLATES.md) - Domain-specific prompts
- [Architecture](ARCHITECTURE.md) - Implementation patterns
- [Troubleshooting](troubleshooting.md) - Common issues

---

**Last updated:** 2026-01-20
**Next review:** 2026-04-20 (quarterly, or after each release)
