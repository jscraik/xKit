<p align="center">
  <img src="./docs/assets/xKit-brand-logo.png" alt="xKit Logo" width="200">
</p>

# xKit — fast X CLI for tweeting, replying, and reading

`xkit` is a fast X CLI for tweeting, replying, and reading via X/Twitter GraphQL (cookie auth).

_Last updated: 2026-01-09_

## Doc requirements

- Audience: CLI users (beginner to intermediate), library consumers, maintainers.
- Scope: install, authentication, CLI usage, JSON output, config, query ID refresh, media uploads, development basics.
- Non-scope: X/Twitter policy guidance, account recovery, or web UI usage.
- Owner: Jamie Craik.
- Review cadence: Quarterly.

## Table of contents

- [Disclaimer](#disclaimer)
- [Risks and assumptions](#risks-and-assumptions)
- [Install](#install)
- [Quickstart](#quickstart)
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

- Assumes you are already logged in to X/Twitter in a supported browser (or provide cookies manually).
- X can rate-limit, challenge, or change GraphQL/REST behavior without notice.
- Cookie extraction reads local browser stores; follow least-privilege practices and avoid sharing cookie values.

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

# Following (who you follow)
xkit following -n 20
xkit following --user 12345678 -n 10  # by user ID

# Followers (who follows you)
xkit followers -n 20
xkit followers --user 12345678 -n 10  # by user ID

# Refresh GraphQL query IDs cache (no rebuild)
xkit query-ids --fresh
```

## Library

`xkit` can be used as a library (same GraphQL client as the CLI):

```ts
import { TwitterClient, resolveCredentials } from '@brainwav/xkit';

const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
const client = new TwitterClient({ cookies });
const result = await client.search('from:username', 50);
```

## Commands

- `xkit tweet "<text>"` — post a new tweet.
- `xkit reply <tweet-id-or-url> "<text>"` — reply to a tweet using its ID or URL.
- `xkit help [command]` — show help (or help for a subcommand).
- `xkit query-ids [--fresh] [--json]` — inspect or refresh cached GraphQL query IDs.
- `xkit read <tweet-id-or-url> [--json]` — fetch tweet content as text or JSON.
- `xkit <tweet-id-or-url> [--json]` — shorthand for `read` when only a URL or ID is provided.
- `xkit replies <tweet-id-or-url> [--json]` — list replies to a tweet.
- `xkit thread <tweet-id-or-url> [--json]` — show the full conversation thread.
- `xkit search "<query>" [-n count] [--json]` — search for tweets matching a query.
- `xkit mentions [-n count] [--user @handle] [--json]` — find tweets mentioning a user (defaults to the authenticated user).
- `xkit bookmarks [-n count] [--folder-id id] [--all] [--max-pages n] [--json]` — list your bookmarked tweets (or a specific bookmark folder); `--max-pages` requires `--all`.
- `xkit unbookmark <tweet-id-or-url...>` — remove one or more bookmarks by tweet ID or URL.
- `xkit likes [-n count] [--json]` — list your liked tweets.
- `xkit following [--user <userId>] [-n count] [--json]` — list users that you (or another user) follow.
- `xkit followers [--user <userId>] [-n count] [--json]` — list users that follow you (or another user).
- `xkit whoami` — print which Twitter account your cookies belong to.
- `xkit check` — show which credentials are available and where they were sourced from.

Global options:

- `--auth-token <token>`: set the `auth_token` cookie manually.
- `--ct0 <token>`: set the `ct0` cookie manually.
- `--cookie-source <safari|chrome|firefox>`: choose browser cookie source (repeatable; order matters).
- `--chrome-profile <name>`: Chrome profile for cookie extraction.
- `--firefox-profile <name>`: Firefox profile for cookie extraction.
- `--cookie-timeout <ms>`: cookie extraction timeout for keychain/OS helpers (milliseconds).
- `--timeout <ms>`: abort requests after the given timeout (milliseconds).
- `--quote-depth <n>`: max quoted tweet depth in JSON output (default: 1; 0 disables).
- `--plain`: stable output (no emoji, no color).
- `--no-emoji`: disable emoji output.
- `--no-color`: disable ANSI colors (or set `NO_COLOR=1`).
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

- Safari: `~/Library/Cookies/Cookies.binarycookies` (fallback: `~/Library/Containers/com.apple.Safari/Data/Library/Cookies/Cookies.binarycookies`)
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

- `--json` prints raw tweet objects for read/replies/thread/search/mentions/bookmarks/likes.
- `read` returns full text for Notes and Articles when present.
- Use `--plain` for stable, script-friendly output (no emoji, no color).

### JSON Schema

When using `--json`, tweet objects include:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Tweet ID |
| `text` | string | Full tweet text (includes Note/Article content when present) |
| `author` | object | `{ username, name }` |
| `authorId` | string? | Author's user ID |
| `createdAt` | string | Timestamp |
| `replyCount` | number | Number of replies |
| `retweetCount` | number | Number of retweets |
| `likeCount` | number | Number of likes |
| `conversationId` | string | Thread conversation ID |
| `inReplyToStatusId` | string? | Parent tweet ID (present if this is a reply) |
| `quotedTweet` | object? | Embedded quote tweet (same schema; depth controlled by `--quote-depth`) |

When using `--json` with `following`/`followers`, user objects include:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | User ID |
| `username` | string | Username/handle |
| `name` | string | Display name |
| `description` | string? | User bio |
| `followersCount` | number? | Followers count |
| `followingCount` | number? | Following count |
| `isBlueVerified` | boolean? | Blue verified flag |
| `profileImageUrl` | string? | Profile image URL |
| `createdAt` | string? | Account creation timestamp |

## Troubleshooting

- Missing cookies or `check` fails: confirm `AUTH_TOKEN` + `CT0` or use `--cookie-source` with a logged-in browser.
- `automated request` / error 226: retry later or expect fallback to legacy `statuses/update.json` for writes.
- `404` on GraphQL operations: run `xkit query-ids --fresh` and retry.

## Query IDs (GraphQL)

X rotates GraphQL “query IDs” frequently. Each GraphQL operation is addressed as:

- `operationName` (e.g. `TweetDetail`, `CreateTweet`)
- `queryId` (rotating ID baked into X’s web client bundles)

`xkit` ships with a baseline mapping in `src/lib/query-ids.json` (copied into `dist/` on build). At runtime,
it can refresh that mapping by scraping X's public web client bundles and caching the result on disk.

Runtime cache:

- Default path: `~/.config/xkit/query-ids-cache.json`
- Override path: `XKIT_QUERY_IDS_CACHE=/path/to/file.json`
- TTL: 24h (stale cache is still used, but marked "not fresh")

Auto-recovery:

- On GraphQL `404` (query ID invalid), `xkit` forces a refresh once and retries.
- For `TweetDetail`/`SearchTimeline`, `xkit` also rotates through a small set of known fallback IDs to reduce
  breakage while refreshing.

Refresh on demand:

```bash
xkit query-ids --fresh
```

Exit codes:

- `0`: success
- `1`: runtime error (network/auth/etc)
- `2`: invalid usage/validation (e.g. bad `--user` handle)

## Version

`xkit --version` prints `package.json` version plus current git sha when available, e.g. `0.3.0 (3df7969b)`.

## Media uploads

- Attach media with `--media` (repeatable) and optional `--alt` per item.
- Up to 4 images/GIFs, or 1 video (no mixing). Supported: jpg, jpeg, png, webp, gif, mp4, mov.
- Images/GIFs + 1 video supported (uploads via Twitter legacy upload endpoint + cookies; video may take longer to process).

Example:

```bash
xkit tweet "hi" --media img.png --alt "desc"
```

## Verify

- `xkit check` to confirm credential sources.
- `xkit whoami` to confirm the authenticated account.
- `xkit read <tweet-id-or-url>` to validate read access.

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

- GraphQL uses internal X endpoints and can be rate limited (429).
- Query IDs rotate; refresh at runtime with `xkit query-ids --fresh` (or update the baked baseline via `pnpm run graphql:update`).

<details>
  <summary>Maintainer acceptance checklist and evidence</summary>

### Acceptance criteria

- [ ] Doc requirements are current (audience, scope, owner, review cadence).
- [ ] Install and quickstart commands run as shown.
- [ ] Authentication and config sections reflect current CLI behavior.
- [ ] Troubleshooting covers top 3 failure modes.
- [ ] Verify steps succeed on a healthy setup.

### Evidence bundle

- Vale: not run (no `.vale.ini` in repo).
- Markdown lint: not run (no config detected).
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
