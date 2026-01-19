# xKit — fast X CLI for tweeting, replying, and reading

`xkit` provides a fast X CLI for tweeting, replying, and reading via X/Twitter GraphQL (cookie auth).

Last updated: 2026-01-09

<p align="center">
  <img src="./docs/assets/xKit-brand-logo.png" alt="xKit Logo" width="200">
</p>

## Doc requirements

- Audience: CLI users (beginner to intermediate), library consumers, maintainers.
- Scope: install, authentication, CLI usage, JSON output, config, query ID refresh, media uploads, development basics.
- Non-scope: X/Twitter policy guidance, account recovery, or web UI usage.
- Owner: Jamie Craik.
- Review cadence: Quarterly.

## Table of contents

- [Disclaimer](#disclaimer)
- [Risks and assumptions](#risks-and-assumptions)
- [Product specs](#product-specs)
- [Install](#install)
- [Quickstart](#quickstart)
- [Bookmark Archiving](#bookmark-archiving) ⭐ NEW
- [Library](#library)
- [Commands](#commands)
- [Authentication (GraphQL)](#authentication-graphql)
- [Config (JSON5)](#config-json5)
- [Output](#output)
- [Troubleshooting](#troubleshooting)
- [Query IDs (GraphQL)](#query-ids-graphql)
- [Version](#version)
- [Media uploads](#media-uploads)
- [Verify](#verify)
- [Development](#development)
- [Notes](#notes)

## Disclaimer

This project uses X/Twitter’s **undocumented** web GraphQL API (and cookie auth). X can change endpoints, query IDs,
and anti-bot behavior at any time — **expect this to break without notice**.

## Risks and assumptions

- Log in to X/Twitter in a supported browser (or provide cookies manually).
- X can rate-limit, challenge, or change GraphQL/REST behavior without notice.
- Cookie extraction reads local browser stores; follow least-privilege practices and avoid sharing cookie values.

## Product specs

- PRD: [.specs/spec-2026-01-15-xkit-prd.md](.specs/spec-2026-01-15-xkit-prd.md)
- Tech spec: [.specs/tech-spec-2026-01-15-xkit.md](.specs/tech-spec-2026-01-15-xkit.md)

## Install

```bash
npm install -g @brainwav/xkit
# or
pnpm add -g @brainwav/xkit
# or
bun add -g @brainwav/xkit

# one-shot (no install)
bunx @brainwav/xkit whoami
```

Homebrew (macOS, prebuilt Bun binary):

```bash
brew install jscraik/tap/xkit
```

## Quickstart

```bash
# Show the logged-in account
xkit whoami

# Discover command help
xkit help whoami

# Read a tweet (URL or ID)
xkit read https://x.com/user/status/1234567890123456789
xkit 1234567890123456789 --json

# Thread + replies
xkit thread https://x.com/user/status/1234567890123456789
xkit replies 1234567890123456789

# Search + mentions
xkit search "from:username" -n 5
xkit mentions -n 5
xkit mentions --user @username -n 5

# Bookmarks
xkit bookmarks -n 5
xkit bookmarks --folder-id 123456789123456789 -n 5 # https://x.com/i/bookmarks/<folder-id>
xkit bookmarks --all --json
xkit bookmarks --all --max-pages 2 --json
xkit unbookmark 1234567890123456789
xkit unbookmark https://x.com/user/status/1234567890123456789

# Likes
xkit likes -n 5

# News & Trending
xkit news -n 10
xkit news --tabs news,sports -n 5
xkit news --tabs trending --no-ai-only -n 20

# Following (who you follow)
xkit following -n 20
xkit following --user 12345678 -n 10  # by user ID

# Followers (who follows you)
xkit followers -n 20
xkit followers --user 12345678 -n 10  # by user ID

# Refresh GraphQL query IDs cache (no rebuild)
xkit query-ids --fresh
```

## Bookmark Archiving

⭐ **NEW**: xKit now includes comprehensive bookmark archiving with automatic enrichment, categorization, and knowledge base organization!

```bash
# Interactive setup wizard
xkit setup

# Archive bookmarks to markdown
xkit archive

# Archive all bookmarks with enrichment
xkit archive --all

# Include media attachments
xkit archive --include-media

# Send notifications to Discord
xkit archive --webhook-url "https://discord.com/..." --webhook-type discord

# Show detailed statistics
xkit archive --stats

# Continuous archiving (daemon mode)
xkit daemon start --interval 30m
```

**Features:**

- 🔗 Automatic URL expansion and content extraction
- 🏷️ Smart categorization (GitHub repos, articles, videos, etc.)
- 📄 Beautiful markdown output with frontmatter
- 💾 Incremental processing (only new bookmarks)
- 📁 Organized knowledge base structure
- 📢 Webhook notifications (Discord, Slack, custom)
- 📂 Folder support with tag preservation
- 📷 Media attachment handling
- 📊 Detailed statistics and progress tracking
- 🤖 Daemon mode for continuous archiving

**See the complete guide:** [docs/bookmark-archiving.md](docs/bookmark-archiving.md)

## Library

Use `xkit` as a library (same GraphQL client as the CLI):

```ts
import { TwitterClient, resolveCredentials } from '@brainwav/xkit';

const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
const client = new TwitterClient({ cookies });

// Search for tweets
const searchResult = await client.search('from:username', 50);

// Fetch news and trending topics
const newsResult = await client.getNews(10, { aiOnly: true });

// Fetch from specific tabs
const sportsNews = await client.getNews(10, {
  aiOnly: true,
  tabs: ['sports', 'entertainment']
});
```

## Commands

- `xkit tweet "<text>"` — post a new tweet.
- `xkit reply <tweet-id-or-url> "<text>"` — reply to a tweet using its ID or URL.
- `xkit help [command]` — show help (or help for a subcommand).
- `xkit query-ids [--fresh] [--json]` — inspect or refresh cached GraphQL query IDs.
- `xkit read <tweet-id-or-url> [--json] [--json-full]` — fetch tweet content as text or JSON.
- `xkit <tweet-id-or-url> [--json] [--json-full]` — shorthand for `read` when you pass only a URL or ID.
- `xkit replies <tweet-id-or-url> [--json] [--json-full]` — list replies to a tweet.
- `xkit thread <tweet-id-or-url> [--json] [--json-full]` — show the full conversation thread.
- `xkit search "<query>" [-n count] [--json] [--json-full]` — search for tweets matching a query.
- `xkit mentions [-n count] [--user @handle] [--json] [--json-full]` — find tweets mentioning a user (defaults to the
  authenticated user).
- `xkit news [-n count] [--tabs <tabs>] [--ai-only] [--json] [--json-full]` — fetch AI-curated news
  and trending topics from X's Explore page tabs.
- `xkit bookmarks [-n count] [--folder-id id] [--all] [--max-pages n] [--json] [--json-full]` — list your bookmarked tweets (or a
  specific bookmark folder); `--max-pages` requires `--all`.
- `xkit unbookmark <tweet-id-or-url...>` — remove one or more bookmarks by tweet ID or URL.
- `xkit likes [-n count] [--json] [--json-full]` — list your liked tweets.
- `xkit following [--user <userId>] [-n count] [--json]` — list users that you (or another user) follow.
- `xkit followers [--user <userId>] [-n count] [--json]` — list users that follow you (or another user).
- `xkit lists [--member-of] [-n count] [--json]` — list your owned lists or lists you belong to.
- `xkit list-timeline <list-id-or-url> [-n count] [--json] [--json-full]` — get tweets from a list timeline.
- `xkit whoami` — print which Twitter account your cookies belong to.
- `xkit check` — show available credentials and their source.

### News & Trending

Fetch AI-curated news and trending topics from X's Explore page tabs:

```bash
# Fetch from default tabs (For You, News, Sports, Entertainment)
xkit news -n 10

# Fetch from specific tabs
xkit news --tabs news,sports -n 5
xkit news --tabs trending -n 20

# Include non-AI-curated content
xkit news --no-ai-only -n 20

# JSON output with full raw API response
xkit news --json-full -n 10
```

**Tab options** (combine with `--tabs`):

- `for_you` — Personalized news and trends
- `trending` — Currently trending topics
- `news` — News headlines
- `sports` — Sports news and events
- `entertainment` — Entertainment news

By default, the command fetches from `for_you`, `news`, `sports`, and `entertainment` tabs (trending excluded to
reduce noise). The system automatically deduplicates headlines across tabs.

Global options:

- `--auth-token <token>`: set the `auth_token` cookie manually.
- `--ct0 <token>`: set the `ct0` cookie manually.
- `--cookie-source <safari|chrome|firefox>`: choose browser cookie source (repeatable; order matters).
- `--chrome-profile <name>`: Chrome profile for cookie extraction.
- `--firefox-profile <name>`: Firefox profile for cookie extraction.
- `--cookie-timeout <ms>`: cookie extraction timeout for keychain/OS helpers (milliseconds).
- `--timeout <ms>`: abort requests after the given timeout (milliseconds).
- `--quote-depth <n>`: max quoted tweet depth in JSON output (default: 1; 0 disables).
<!-- vale off -->
- `--plain`: stable output (no emoji, no ANSI styling).
- `--no-emoji`: disable emoji output.
- `--no-color`: disable ANSI styling (or set `NO_COLOR=1`).
<!-- vale on -->
- `--media <path>`: attach media file (repeatable, up to 4 images or 1 video).
- `--alt <text>`: alt text for the corresponding `--media` (repeatable).

## Authentication (GraphQL)

GraphQL mode uses your existing X/Twitter web session (no password prompt). It sends requests to internal
X endpoints and authenticates via cookies (`auth_token`, `ct0`).

Write operations:

- `tweet`/`reply` primarily use GraphQL (`CreateTweet`).
- If GraphQL returns error `226` ("automated request"), `xkit` falls back to the legacy `statuses/update.json` endpoint.

`xkit` resolves credentials in this order:

1. CLI flags: `--auth-token`, `--ct0`
2. Environment variables: `AUTH_TOKEN`, `CT0` (fallback: `TWITTER_AUTH_TOKEN`, `TWITTER_CT0`)
3. Browser cookies via `@steipete/sweet-cookie` (override via `--cookie-source` order)

Browser cookie sources:

- Safari: `~/Library/Cookies/Cookies.binarycookies` (fallback:
  `~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies`)
- Chrome: `~/Library/Application Support/Google/Chrome/<Profile>/Cookies`
- Firefox: `~/Library/Application Support/Firefox/Profiles/<profile>/cookies.sqlite`

## Config (JSON5)

Config precedence: CLI flags > env vars > project config > global config.

- Global: `~/.config/xkit/config.json5`
- Project: `./.xkitrc.json5`

Example `~/.config/xkit/config.json5`:

```json5
{
  // Cookie source order for browser extraction (string or array)
  cookieSource: ["firefox", "safari"],
  firefoxProfile: "default-release",
  cookieTimeoutMs: 30000,
  timeoutMs: 20000,
  quoteDepth: 1
}
```

Environment shortcuts:

- `XKIT_TIMEOUT_MS`
- `XKIT_COOKIE_TIMEOUT_MS`
- `XKIT_QUOTE_DEPTH`

## Output

- `--json` prints raw tweet objects for read/replies/thread/search/mentions/bookmarks/likes/list-timeline.
- `--json-full` includes the raw GraphQL API response in a `_raw` field (available for tweet and news commands).
- `read` returns full text for Notes and Articles when present.
<!-- vale off -->
- Use `--plain` for stable, script-friendly output (no emoji, no ANSI styling).
<!-- vale on -->

### JSON Schema

When using `--json`, tweet objects include:

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Tweet ID |
| `text` | string | Full tweet text (includes Note/Article content when present) |
| `author` | object | `{ username, name }` |
| `authorId` | string? | Author's user ID |
| `createdAt` | string | Timestamp |
| `replyCount` | number | Number of replies |
| `retweetCount` | number | Number of retweets |
| `likeCount` | number | Number of likes |
| `conversationId` | string | Thread conversation ID |
| `inReplyToStatusId` | string? | Parent tweet ID (present for replies) |
| `quotedTweet` | object? | Embedded quote tweet (same schema; depth controlled by `--quote-depth`) |

When using `--json` with `following`/`followers`, user objects include:

<!-- vale off -->

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | User ID |
| `username` | string | Username/handle |
| `name` | string | Display name |
| `description` | string? | User bio |
| `followersCount` | number? | Followers count |
| `followingCount` | number? | Following count |
| `isBlueVerified` | boolean? | Blue verified flag |
| `profileImageUrl` | string? | Profile image URL |
| `createdAt` | string? | Account creation timestamp |

<!-- vale on -->

When using `--json` with `news`, news objects include:

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Unique identifier for the news item |
| `headline` | string | News headline or trend title |
| `category` | string? | Category (e.g., "AI · Technology", "Trending", "News") |
| `timeAgo` | string? | Relative time (e.g., "2h ago") |
| `postCount` | number? | Number of posts |
| `description` | string? | Item description |
| `url` | string? | URL to the trend or news article |
| `tab` | string? | Source tab (for_you, trending, news, sports, entertainment) |
| `_raw` | object? | Raw API response (only with `--json-full`) |

## Troubleshooting

- Missing cookies or `check` fails: confirm `AUTH_TOKEN` + `CT0` or use `--cookie-source` with a logged-in browser.
- `automated request` / error 226: retry later or expect fallback to legacy `statuses/update.json` for writes.
- `404` on GraphQL operations: run `xkit query-ids --fresh` and retry.

**For detailed troubleshooting, see [docs/troubleshooting.md](docs/troubleshooting.md).**

## Known Limitations

**Current limitations of xKit:**

- Cookie extraction only works on macOS (Safari, Chrome, Firefox); Linux/Windows users must provide auth tokens manually
- Uses undocumented X/Twitter GraphQL API that may change without notice
- AI summarization requires Ollama to be installed and running locally
- Archive processing is sequential (not parallel) for large bookmark collections
- No multi-account support (single account per installation)

**For complete details and planned improvements, see [LIMITATIONS.md](LIMITATIONS.md).**

## Query IDs (GraphQL)

X rotates GraphQL “query IDs” frequently. Each GraphQL operation uses:

- `operationName` (e.g. `TweetDetail`, `CreateTweet`)
- `queryId` (rotating ID baked into X’s web client bundles)

`xkit` ships with a baseline mapping in `src/lib/query-ids.json` (copied into `dist/` on build). At runtime,
it can refresh that mapping by scraping X's public web client bundles and caching the result on disk.

Runtime cache:

- Default path: `~/.config/xkit/query-ids-cache.json`
- Override path: `XKIT_QUERY_IDS_CACHE=/path/to/file.json`
- TTL: 24h (stale cache stays usable, but marked "not fresh")

Auto-recovery:

- On GraphQL `404` (query ID malformed), `xkit` forces a refresh once and retries.
- For `TweetDetail`/`SearchTimeline`, `xkit` also rotates through a small set of known fallback IDs to reduce
  breakage while refreshing.

Refresh on demand:

```bash
xkit query-ids --fresh
```

Exit codes:

- `0`: success
- `1`: runtime error (network/auth/etc)
- `2`: malformed usage/validation (e.g. bad `--user` handle)

## Version

`xkit --version` prints `package.json` version plus current git sha when available, e.g. `0.3.0 (3df7969b)`.

## Media uploads

- Attach media with `--media` (repeatable) and optional `--alt` per item.
- Up to 4 images/GIFs, or 1 video (no mixing). Supported: jpg, jpeg, png, webp, gif, mp4, mov.
- Images/GIFs + 1 video supported (uploads via Twitter legacy upload endpoint + cookies; video may take longer to
  process).

Example:

```bash
xkit tweet "hi" --media img.png --alt "desc"
```

## Verify

- `xkit check` to confirm credential sources.
- `xkit whoami` to confirm the authenticated account.
- `xkit read <tweet-id-or-url>` to confirm read access.

## Development

```bash
cd ~/Projects/xkit
pnpm install
pnpm run build       # dist/ + bun binary
pnpm run build:dist  # dist/ only
pnpm run build:binary

pnpm run dev tweet "Test"
pnpm run dev -- --plain check
pnpm test
pnpm run lint
```

## Releasing

See [docs/releases.md](docs/releases.md) for the complete release process using Changesets.

**Quick summary:**

```bash
# Create a changeset for your changes
pnpm changeset

# Commit and push - the Release workflow will handle the rest
git add .changeset/
git commit -m "Add changeset for feature X"
git push
```

## Notes

- GraphQL uses internal X endpoints and may face rate limits (429).
- Query IDs rotate; refresh at runtime with `xkit query-ids --fresh` (or update the baked baseline via
  `pnpm run graphql:update`).

<details>
  <summary>Maintainer acceptance checklist and evidence</summary>

### Acceptance criteria

- [ ] Doc requirements reflect current audience, scope, owner, and review cadence.
- [ ] Install and quickstart commands run as shown.
- [ ] Authentication and config sections reflect current CLI behavior.
- [ ] Troubleshooting covers the top 3 common issues.
- [ ] Verify steps succeed on a healthy setup.

### Evidence bundle

- Vale: ran (0 errors, 0 warnings, 0 suggestions).
- Markdown lint: ran (0 errors).
- Readability check: not run (no `scripts/check_readability.py`).
- Brand check: not run (no `scripts/check_brand_guidelines.py`).

</details>

---

<img
  src="./brand/brand-mark.webp"
  srcset="./brand/brand-mark.webp 1x, ./brand/brand-mark@2x.webp 2x"
  alt="brAInwav"
  height="28"
  align="left"
/>

<br clear="left" />

**brAInwav**  
_from demo to duty_
