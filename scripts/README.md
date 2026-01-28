# xKit Scripts

Utility scripts for xKit development and user profile archiving.

## User Profile Archiving

### archive-user-profile.mjs

One-time archiving of tweets from a specific user profile.

**Usage:**

```bash
# Basic usage - archive 200 most recent tweets
node scripts/archive-user-profile.mjs @jh3yy

# Custom limit
node scripts/archive-user-profile.mjs @jh3yy --limit 500

# JSON output
node scripts/archive-user-profile.mjs @jh3yy --format json

# Custom output path
node scripts/archive-user-profile.mjs @jh3yy --output custom/path.md
```

**Features:**

- Fetches tweets using xKit's search functionality
- Supports markdown or JSON output
- Adds metadata header to markdown files
- Shows file statistics after completion

### extract-by-year.mjs

Extract tweets from a user profile and organize them by year.

**Usage:**

```bash
# Extract 2024-2026 (default years) using timeline method
node scripts/extract-by-year.mjs @jh3yy

# Extract specific years
node scripts/extract-by-year.mjs @jh3yy --years 2024,2025,2026

# Use search method with date-filtered queries
node scripts/extract-by-year.mjs @jh3yy --method search --years 2024

# Extract all years to custom directory
node scripts/extract-by-year.mjs @jh3yy --all --output-dir ./archives

# Markdown output instead of JSON
node scripts/extract-by-year.mjs @jh3yy --format markdown
```

**Methods:**

- **timeline** (default): Fetches all available tweets (~3200 max), then filters by year locally
- **search**: Uses date-filtered search queries like `from:username since:2024-01-01 until:2024-12-31`

**Features:**

- Organizes tweets by year in separate files
- Creates combined JSON file with all years
- Supports both JSON and markdown output
- GraphQL-based via xKit's TwitterClient
- Configurable output directories

**Output structure:**

```
knowledge/by-year/jh3yy/
├── jh3yy-2024-2026-01-24.json
├── jh3yy-2025-2026-01-24.json
├── jh3yy-2026-2026-01-24.json
└── jh3yy-all-years-2026-01-24.json
```

**Note:** For complete archives, use the `timeline` method with `--all` flag. The `search` method is limited to ~200 tweets per year due to Twitter's search API limits.

### archive-user-daemon.mjs

Continuous archiving daemon for tracking multiple users over time.

**Usage:**

```bash
# Single user
node scripts/archive-user-daemon.mjs --users @jh3yy

# Multiple users
node scripts/archive-user-daemon.mjs --users @jh3yy,@addyosmani,@wesbos

# Custom interval (30 minutes)
node scripts/archive-user-daemon.mjs --users @jh3yy --interval 30

# Using config file
node scripts/archive-user-daemon.mjs --config examples/archive-config.json
```

**Features:**

- Incremental archiving (only new tweets)
- State tracking to avoid duplicates
- Daily markdown files organized by user
- Automatic scheduling with configurable intervals
- Graceful shutdown (Ctrl+C)

**Config file format:**

```json
{
  "users": ["jh3yy", "username2"],
  "interval": 60,
  "limit": 50,
  "outputDir": "knowledge/profiles"
}
```

**Output structure:**

```
knowledge/profiles/
├── .archive-state.json          # Tracks last archived tweet IDs
├── jh3yy/
│   ├── 2026-01-23.md
│   └── 2026-01-24.md
└── username2/
    └── 2026-01-23.md
```

## Bookmark-First Workflow (Recommended when GraphQL fails)

When Twitter's GraphQL search endpoints are broken (HTTP 404 errors), use this workaround:

### auto-bookmark-profile.ts

Automatically bookmark all tweets from a user profile using Playwright.

**Usage:**

```bash
# Basic usage - bookmark all tweets from @jh3yy
npx tsx scripts/auto-bookmark-profile.ts @jh3yy

# Limit to 500 most recent tweets
npx tsx scripts/auto-bookmark-profile.ts @jh3yy --max-tweets 500

# Headless mode (no browser window)
npx tsx scripts/auto-bookmark-profile.ts @jh3yy --headless

# Custom state file for resume capability
npx tsx scripts/auto-bookmark-profile.ts @jh3yy --state-path ./jh3yy-state.json
```

**Features:**

- Uses Playwright to automate a real browser
- Scrolls through profile to load all tweets
- Clicks bookmark button on each unbookmarked tweet
- Resumes from last position if interrupted (state file)
- Tracks already bookmarked tweets to avoid duplicates
- Graceful shutdown with Ctrl+C (saves progress)

**How it works:**

1. Opens Chromium browser (or uses headless mode)
2. Navigates to user's profile on x.com
3. Scrolls down to load tweets (respects Twitter's scroll loading)
4. Extracts tweet IDs from the page
5. Visits each tweet and clicks bookmark
6. Saves progress to state file after each bookmark

**Requirements:**

- Playwright installed (`pnpm add -D playwright @playwright/test`)
- Must be logged into Twitter/X in browser
- For first run, browser window opens so you can log in

### export-bookmarks-by-year.mjs

Export all bookmarks and organize by year.

**Usage:**

```bash
# Export all bookmarks organized by year
node scripts/export-bookmarks-by-year.mjs

# Export only @jh3yy's bookmarks
node scripts/export-bookmarks-by-year.mjs --filter-by jh3yy

# Export as markdown
node scripts/export-bookmarks-by-year.mjs --filter-by jh3yy --format markdown

# Export only specific years
node scripts/export-bookmarks-by-year.mjs --filter-by jh3yy --years 2024,2025,2026
```

**Features:**

- Fetches all bookmarks via xKit (works reliably)
- Filters by username
- Organizes by year
- JSON or markdown output
- Creates per-year files plus combined file

**Complete workflow:**

```bash
# Step 1: Bookmark all tweets from @jh3yy
npx tsx scripts/auto-bookmark-profile.ts @jh3yy --max-tweets 2000

# Step 2: Export bookmarks organized by year
node scripts/export-bookmarks-by-year.mjs --filter-by jh3yy --format json
```

**Output structure:**

```
knowledge/bookmarks-by-year/
├── bookmarks-2026-2026-01-24.json
├── bookmarks-2025-2026-01-24.json
├── bookmarks-2024-2026-01-24.json
└── bookmarks-all-years-2026-01-24.json
```

**Why this works when GraphQL fails:**

- Bookmarks use different GraphQL endpoints (TweetDetail vs SearchTimeline)
- Playwright bypasses GraphQL entirely by automating the browser
- DOM structure changes less frequently than query IDs

## Development Scripts

### copy-dist-assets.js

Copies non-TypeScript assets (JSON files, etc.) to the dist directory during build.

**Usage:**

```bash
node scripts/copy-dist-assets.js
```

Called automatically by `pnpm run build:dist`.

### update-query-ids.ts

Updates the baseline GraphQL query ID mappings by scraping X's web client bundles.

**Usage:**

```bash
pnpm run graphql:update
```

This updates `src/lib/query-ids.json` with the latest query IDs from X/Twitter.

### Migration Scripts

Located in `scripts/migration/`:

- **reorganize-by-year-month.mjs** - Reorganizes knowledge files by year/month
- **reorganize-knowledge-files.mjs** - General knowledge file reorganization
- **find-duplicate-bookmarks.mjs** - Finds duplicate bookmarks in exports

## Documentation

For complete documentation on user profile archiving, see:

- [docs/user-profile-archiving.md](../docs/user-profile-archiving.md)

For bookmark archiving (different from profile archiving), see:

- [docs/bookmark-archiving.md](../docs/bookmark-archiving.md)

## Requirements

- Node.js 22+
- xKit installed and configured with valid authentication
- For daemon mode: sufficient API rate limits for continuous polling

## Tips

1. **Start with one-time archives** to test before running the daemon
2. **Use reasonable limits** (50-200 tweets) to avoid rate limiting
3. **Check the state file** (`.archive-state.json`) to see what's been archived
4. **Organize by topic** using different output directories
5. **Monitor rate limits** when archiving multiple users frequently

## Troubleshooting

### Authentication errors

Make sure xKit is configured with valid credentials:

```bash
xkit check
xkit whoami
```

### Rate limiting

If you hit rate limits:

- Reduce `--limit` to 20-50 tweets
- Increase `--interval` to 120+ minutes
- Archive fewer users simultaneously

### No tweets found

- Verify the username is correct (without @)
- User may have protected tweets
- User may not have recent tweets
