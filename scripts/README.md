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
