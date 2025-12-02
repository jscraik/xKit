# bird 🐦

`bird` is a focused command-line tool for posting tweets, replying, and reading tweet details using Twitter/X's GraphQL API. It keeps setup minimal while supporting common workflows for automation or scripting.

## Installation

```bash
cd ~/Projects/bird
pnpm install
pnpm run binary  # Creates the 'bird' executable
```

## Usage

### Commands at a glance
- `bird tweet "<text>"` — post a new tweet.
- `bird reply <tweet-id-or-url> "<text>"` — reply to a tweet using its ID or URL.
- `bird read <tweet-id-or-url> [--json]` — fetch tweet content as text or JSON.
- `bird search "<query>" [-n count] [--json]` — search for tweets matching a query.
- `bird mentions [-n count] [--json]` — find tweets mentioning @clawdbot.
- `bird check` — show which credentials are available and where they were sourced from.

### Post a tweet

```bash
bird tweet "Hello from bird!"
```

### Reply to a tweet

```bash
# Using tweet URL
bird reply "https://x.com/user/status/1234567890" "This is my reply"

# Using tweet ID directly
bird reply 1234567890 "This is my reply"
```

### Read a tweet

```bash
# Get tweet content by URL or ID
bird read "https://x.com/user/status/1234567890"
bird read 1234567890 --json
```

### Search tweets

```bash
# Search for tweets containing a query
bird search "claude AI" -n 10

# Search for mentions of a user
bird search "@clawdbot"
```

### Find mentions

```bash
# Shortcut to search for @clawdbot mentions
bird mentions -n 10
bird mentions --json
```

### Check credentials

```bash
bird check
```

## Authentication

`bird` resolves credentials in the following order of priority:

1. **CLI arguments** (highest priority)
   ```bash
   bird --auth-token "xxx" --ct0 "yyy" tweet "Hello"
   ```

2. **Environment variables**
   ```bash
   export AUTH_TOKEN="xxx"
   export CT0="yyy"
   bird tweet "Hello"
   ```

   Alternative env var names: `TWITTER_AUTH_TOKEN`, `TWITTER_CT0`

3. **Chrome cookies** (fallback - macOS only)
   - Automatically extracts from Chrome's cookie database
   - Requires Chrome to be logged into x.com
   - May prompt for keychain access on first run

### Getting Your Cookies

1. Open Chrome and log into x.com
2. Open DevTools (Cmd+Option+I)
3. Go to Application > Cookies > x.com
4. Copy the values for `auth_token` and `ct0`

## Development

```bash
# Run in development mode
pnpm run dev tweet "Test"

# Run tests
pnpm test

# Run linter
pnpm run lint

# Fix lint issues
pnpm run lint:fix
```

## Notes

- Chrome cookie extraction requires macOS (uses `sqlite3` and `security` CLI tools).
- The keychain access may block when running over SSH; use environment variables instead.
- Twitter/X may rotate GraphQL query IDs; update `src/lib/twitter-client.ts` if requests start failing.
