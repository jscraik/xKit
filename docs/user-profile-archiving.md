# User Profile Archiving

Archive tweets from specific X/Twitter users to your knowledge base for reference and learning.

## Quick Start

### One-Time Archive

Archive all recent tweets from a user:

```bash
node scripts/archive-user-profile.mjs @jh3yy
```

This will:

- Fetch the 200 most recent tweets from @jh3yy
- Save them to `knowledge/jh3yy-archive-YYYY-MM-DD.md`
- Include tweet text, media links, and metadata

### Custom Options

```bash
# Fetch more tweets
node scripts/archive-user-profile.mjs @jh3yy --limit 500

# Save as JSON for processing
node scripts/archive-user-profile.mjs @jh3yy --format json

# Custom output location
node scripts/archive-user-profile.mjs @jh3yy --output custom/path.md
```

## Continuous Archiving (Daemon)

For ongoing archiving of multiple users, use the daemon script:

### Basic Usage

```bash
# Archive a single user every hour
node scripts/archive-user-daemon.mjs --users @jh3yy

# Archive multiple users
node scripts/archive-user-daemon.mjs --users @jh3yy,@addyosmani,@wesbos

# Custom check interval (30 minutes)
node scripts/archive-user-daemon.mjs --users @jh3yy --interval 30
```

### Using a Config File

Create `archive-config.json`:

```json
{
  "users": ["jh3yy", "addyosmani", "wesbos"],
  "interval": 60,
  "limit": 50,
  "outputDir": "knowledge/profiles"
}
```

Run the daemon:

```bash
node scripts/archive-user-daemon.mjs --config archive-config.json
```

### Daemon Features

- **Incremental archiving**: Only saves new tweets since last check
- **State tracking**: Remembers the last archived tweet ID per user
- **Daily files**: Organizes tweets by date in separate markdown files
- **Automatic scheduling**: Runs continuously at specified intervals
- **Graceful shutdown**: Press Ctrl+C to stop

## Output Structure

### One-Time Archive

```
knowledge/
└── jh3yy-archive-2026-01-23.md
```

### Daemon Archive

```
knowledge/profiles/
├── .archive-state.json          # Tracks last archived tweet IDs
├── jh3yy/
│   ├── 2026-01-23.md
│   └── 2026-01-24.md
├── addyosmani/
│   └── 2026-01-23.md
└── wesbos/
    └── 2026-01-23.md
```

## Use Cases

### Learning from Code Examples

Archive developers who share code snippets:

```bash
node scripts/archive-user-profile.mjs @jh3yy --limit 500
```

@jh3yy frequently posts CSS and JavaScript effects - perfect for building a reference library.

### Building a Knowledge Base

Track thought leaders in your field:

```json
{
  "users": [
    "addyosmani",
    "wesbos", 
    "kentcdodds",
    "dan_abramov"
  ],
  "interval": 120,
  "limit": 50,
  "outputDir": "knowledge/dev-leaders"
}
```

### Research and Analysis

Archive tweets for later analysis:

```bash
# Get JSON for processing
node scripts/archive-user-profile.mjs @researcher --limit 1000 --format json
```

## Tips

1. **Start small**: Begin with 50-200 tweets to avoid rate limits
2. **Use daemon for ongoing**: Set up the daemon for users you want to track continuously
3. **Organize by topic**: Use different output directories for different categories
4. **Check state file**: The `.archive-state.json` shows what's been archived
5. **Rate limits**: Space out large archives to avoid hitting API limits

## Authentication

Both scripts use xKit's existing authentication. Make sure you have:

- Valid cookies configured (see main README)
- Either `AUTH_TOKEN` and `CT0` environment variables
- Or cookies extracted from your browser

## Troubleshooting

### "Missing required credentials"

Set up authentication first:

```bash
export AUTH_TOKEN="your_auth_token"
export CT0="your_ct0_token"
```

### "No tweets found"

- Check the username is correct (without @)
- User may have protected tweets
- User may not have any recent tweets

### Rate Limiting

If you hit rate limits:

- Reduce `--limit` to 20-50 tweets
- Increase `--interval` to 120+ minutes for daemon
- Wait before retrying

## Advanced Usage

### Filter by Content

Combine with grep to find specific content:

```bash
node scripts/archive-user-profile.mjs @jh3yy --format json | \
  jq '.[] | select(.text | contains("CSS"))'
```

### Automated Backups

Add to cron for daily archives:

```bash
# Daily at 2am
0 2 * * * cd /path/to/xkit && node scripts/archive-user-profile.mjs @jh3yy
```

### Multiple Profiles

Create separate configs for different topics:

```bash
# Frontend developers
node scripts/archive-user-daemon.mjs --config frontend-devs.json

# Design inspiration  
node scripts/archive-user-daemon.mjs --config designers.json
```

## See Also

- [Bookmark Archiving](bookmark-archiving.md) - Archive your own bookmarks
- [Configuration](configuration.md) - xKit configuration options
- [API Reference](api-reference.md) - Using xKit as a library
