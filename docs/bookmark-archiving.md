# Bookmark Archiving

xKit now includes comprehensive bookmark archiving capabilities inspired by [Smaug](https://github.com/alexknowshtml/smaug), allowing you to archive your Twitter/X bookmarks to markdown with automatic enrichment, categorization, and knowledge base organization.

## Quick Start

```bash
# Interactive setup wizard
xkit setup

# Archive bookmarks to markdown
xkit archive

# Archive with options
xkit archive --all --output-dir ./my-knowledge
```

## Features

### 🔗 URL Expansion & Content Extraction

- Automatically expands t.co shortened URLs
- Extracts content from linked pages (GitHub repos, articles, videos)
- Fetches GitHub README files, stars, and metadata
- Extracts article titles, authors, and reading time
- Supports video metadata extraction

### 🏷️ Smart Categorization

- Automatically categorizes bookmarks by content type
- Default categories: GitHub repos, articles, videos, podcasts, tweets
- Customizable category rules and actions
- Category-based file organization

### 📄 Markdown Output

- Beautiful markdown files with frontmatter
- Organized by date in main archive
- Separate files for GitHub repos and articles
- Rich metadata and context preservation

### 💾 Incremental Processing

- Tracks processed bookmarks to avoid duplicates
- Resume from where you left off
- Force re-processing with `--force` flag

### 📁 Knowledge Base Organization

```
knowledge/
├── tools/          # GitHub repositories
├── articles/       # Blog posts and articles
├── videos/         # Video content
└── podcasts/       # Podcast episodes
bookmarks.md        # Main archive file
```

### 📢 Webhook Notifications

- Discord webhook support with rich embeds
- Slack webhook support with attachments
- Generic webhook support for custom integrations
- Notifications for start, success, error, and rate limit events
- Color-coded messages with detailed statistics

### 📂 Folder Support

- Map Twitter bookmark folders to tag names
- Preserve folder organization as tags
- Fetch from specific folders
- Add folder tags automatically

### 🎬 Media Attachment Support

- Extract media from tweets (photos, videos, GIFs)
- Media metadata (type, URL, dimensions, duration)
- Format media for markdown output
- Configurable media inclusion

### 📊 Progress & Stats Reporting

- Real-time progress tracking with progress bars
- Processing time breakdown
- Archive growth statistics (daily/weekly/monthly)
- Detailed performance metrics
- Error tracking

### 🤖 Daemon/Watch Mode

- Continuous background archiving
- Configurable intervals (30s, 5m, 1h, etc.)
- Run on start option
- Automatic retry with exponential backoff
- Status tracking and reporting
- Graceful shutdown handling

## Commands

### Setup Wizard

```bash
xkit setup
```

Interactive wizard that:

- Auto-detects Twitter credentials from browser
- Creates necessary directories
- Generates configuration file
- Tests connection

### Archive Command

```bash
# Archive 20 most recent bookmarks
xkit archive

# Archive all bookmarks
xkit archive --all

# Archive with pagination limit
xkit archive --all --max-pages 5

# Archive specific count
xkit archive -n 50

# Force re-process already archived
xkit archive --force

# Skip enrichment (faster, less data)
xkit archive --skip-enrichment

# Skip categorization
xkit archive --skip-categorization

# Include media attachments
xkit archive --include-media

# Archive from specific folder
xkit archive --folder-id 1234567890

# With webhook notifications
xkit archive --webhook-url "https://discord.com/api/webhooks/..." --webhook-type discord

# Show detailed statistics
xkit archive --stats

# Custom output paths
xkit archive --output-dir ./my-knowledge --archive-file ./my-bookmarks.md

# Custom timezone
xkit archive --timezone "Europe/London"

# Full-featured example
xkit archive --all --include-media --stats \
  --webhook-url "https://discord.com/api/webhooks/..." \
  --webhook-type discord \
  --output-dir ./knowledge
```

### Daemon Commands

```bash
# Start daemon (runs every 30 minutes)
xkit daemon start --interval 30m

# Start and run immediately
xkit daemon start --interval 1h --run-now

# Check daemon status
xkit daemon status

# Stop daemon
xkit daemon stop
```

### Existing Bookmark Commands

All existing bookmark commands still work:

```bash
# Fetch bookmarks as JSON
xkit bookmarks -n 20 --json

# Fetch from specific folder
xkit bookmarks --folder-id 123456789

# Fetch all with pagination
xkit bookmarks --all --max-pages 10
```

## Configuration

### Config File

Create `.xkitrc.json5` in your project directory:

```json5
{
  // Twitter credentials
  twitter: {
    authToken: "your_auth_token",
    ct0: "your_ct0"
  },
  
  // Output configuration
  output: {
    archiveFile: "./bookmarks.md",
    knowledgeDir: "./knowledge"
  },
  
  // Enrichment settings
  enrichment: {
    expandUrls: true,
    extractContent: true,
    followRedirects: true,
    maxRedirects: 10,
    timeout: 10000
  },
  
  // Categorization settings
  categorization: {
    enabled: true,
    categories: {
      // Custom category example
      research: {
        match: ["arxiv.org", "papers.", "scholar.google"],
        action: "file",
        folder: "./knowledge/research",
        template: "article",
        description: "Academic papers"
      }
    }
  },
  
  // Timezone for date formatting
  timezone: "America/New_York",
  
  // Folder mappings
  folders: {
    "1234567890": "ai-tools",
    "0987654321": "articles-to-read",
    "1122334455": "research"
  },
  
  // Media settings
  media: {
    includeMedia: true
  },
  
  // Webhook notifications
  webhook: {
    url: "https://discord.com/api/webhooks/...",
    type: "discord", // or "slack" or "generic"
    notifyOn: {
      start: true,
      success: true,
      error: true,
      rateLimit: true
    }
  },
  
  // Daemon settings
  daemon: {
    interval: "30m",
    runOnStart: false,
    maxRetries: 3
  }
}
```

### Environment Variables

```bash
# Twitter credentials
export AUTH_TOKEN="your_auth_token"
export CT0="your_ct0"

# Output paths
export ARCHIVE_FILE="./bookmarks.md"
export KNOWLEDGE_DIR="./knowledge"

# Timezone
export TIMEZONE="America/New_York"
```

## Categories

### Default Categories

| Category | Matches | Action | Destination |
|----------|---------|--------|-------------|
| **github** | github.com | file | `./knowledge/tools/` |
| **article** | medium.com, substack.com, dev.to, blog.*, news.*, arxiv.org | file | `./knowledge/articles/` |
| **video** | youtube.com, vimeo.com, twitch.tv | transcribe | `./knowledge/videos/` |
| **podcast** | spotify.com/episode, podcasts.apple.com | transcribe | `./knowledge/podcasts/` |
| **tweet** | x.com, twitter.com (fallback) | capture | bookmarks.md only |

### Category Actions

- **file**: Create a separate markdown file with rich metadata
- **capture**: Add to bookmarks.md only (no separate file)
- **transcribe**: Flag for future transcription (placeholder for now)

### Custom Categories

Add custom categories in your config:

```json5
{
  categorization: {
    categories: {
      newsletter: {
        match: ["buttondown.email", "beehiiv.com"],
        action: "file",
        folder: "./knowledge/newsletters",
        template: "article",
        description: "Newsletter issues"
      },
      documentation: {
        match: ["docs.", "documentation.", "api."],
        action: "file",
        folder: "./knowledge/docs",
        template: "article",
        description: "Technical documentation"
      }
    }
  }
}
```

## Output Examples

### Main Archive (bookmarks.md)

```markdown
# Thursday, January 15, 2026

## @simonw - Gist Host Fork for Rendering GitHub Gists
> I forked the wonderful gistpreview.github.io to create gisthost.github.io

- **Tweet:** https://x.com/simonw/status/123456789
- **Link:** https://gisthost.github.io/
- **Filed:** [gisthost-gist-rendering.md](./knowledge/articles/gisthost-gist-rendering.md)
- **What:** Free GitHub Pages-hosted tool that renders HTML files from Gists.

---

## @tom_doerr - Whisper-Flow Real-time Transcription
> This is amazing - real-time transcription with Whisper

- **Tweet:** https://x.com/tom_doerr/status/987654321
- **Link:** https://github.com/dimastatz/whisper-flow
- **Filed:** [whisper-flow.md](./knowledge/tools/whisper-flow.md)
- **What:** Real-time speech-to-text using OpenAI Whisper with streaming support.
- **Tags:** #ai, #transcription, #whisper

---
```

### GitHub Repository File (knowledge/tools/whisper-flow.md)

```markdown
---
title: "whisper-flow"
type: tool
date_added: 2026-01-15T10:30:00Z
source: "https://github.com/dimastatz/whisper-flow"
tags: ["ai", "transcription", "whisper", "streaming", "python"]
via: "Twitter bookmark from @tom_doerr"
author: "dimastatz"
url: "https://github.com/dimastatz/whisper-flow"
---

# whisper-flow

Real-time speech-to-text transcription using OpenAI Whisper with streaming support.

## Metadata

- **Stars:** 1,234
- **Language:** Python

## README

[README content extracted from GitHub...]

## Links

- [GitHub Repository](https://github.com/dimastatz/whisper-flow)
- [Original Tweet](https://x.com/tom_doerr/status/987654321)

## Original Tweet

> This is amazing - real-time transcription with Whisper

— @tom_doerr (Tom Doerr)
```

### Article File (knowledge/articles/article-title.md)

```markdown
---
title: "How to Build Better APIs"
type: article
date_added: 2026-01-15T11:00:00Z
source: "https://example.com/better-apis"
tags: ["api", "design", "development"]
via: "Twitter bookmark from @apiexpert"
author: "Jane Developer"
published_date: "2026-01-10"
reading_time: 8
url: "https://example.com/better-apis"
---

# How to Build Better APIs

**Author:** Jane Developer • **Published:** 2026-01-10 • **Reading Time:** 8 min

## Summary

A comprehensive guide to designing and building better APIs...

## Links

- [Read Article](https://example.com/better-apis)
- [Original Tweet](https://x.com/apiexpert/status/111222333)

## Discovered Via

> Great article on API design principles

— @apiexpert (API Expert)
```

## State Management

xKit tracks processed bookmarks in `.xkit/state/bookmarks-state.json`:

```json
{
  "lastExportTimestamp": "2026-01-15T12:00:00Z",
  "lastBookmarkId": "1234567890",
  "processedBookmarkIds": ["123...", "456...", "789..."],
  "totalProcessed": 150
}
```

This enables:

- Incremental updates (only process new bookmarks)
- Resume after interruption
- Duplicate detection
- Progress tracking

## Library Usage

Use xKit's bookmark archiving as a library:

```typescript
import {
  BookmarkEnricher,
  BookmarkCategorizer,
  MarkdownWriter,
  StateManager,
  TwitterClient,
  resolveCredentials,
} from '@brainwav/xkit';

// Setup
const { cookies } = await resolveCredentials({ cookieSource: 'safari' });
const client = new TwitterClient({ cookies });
const enricher = new BookmarkEnricher();
const categorizer = new BookmarkCategorizer();
const writer = new MarkdownWriter();
const state = new StateManager();

// Fetch bookmarks
const result = await client.getBookmarks(50);
const bookmarks = result.tweets || [];

// Filter new bookmarks
const newBookmarks = state.filterNew(bookmarks);

// Enrich
const enriched = await enricher.enrichBatch(newBookmarks);

// Categorize
const categorized = categorizer.categorizeBatch(enriched);

// Write to markdown
await writer.write(categorized);

// Update state
state.markBatchProcessed(categorized.map(b => b.id));
state.save();
```

## Automation

### Daemon Mode (Recommended)

```bash
# Start daemon with 30-minute interval
xkit daemon start --interval 30m --run-now

# Check status
xkit daemon status

# Stop daemon
xkit daemon stop
```

### PM2

```bash
npm install -g pm2

# Run every 30 minutes
pm2 start "xkit archive" --cron "*/30 * * * *" --name xkit-archive
pm2 save
pm2 startup
```

### Cron

```bash
crontab -e

# Add this line (runs every 30 minutes)
*/30 * * * * cd /path/to/project && xkit archive >> xkit.log 2>&1
```

### GitHub Actions

```yaml
name: Archive Bookmarks

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      
      - run: npm install -g @brainwav/xkit
      
      - name: Archive bookmarks
        env:
          AUTH_TOKEN: ${{ secrets.TWITTER_AUTH_TOKEN }}
          CT0: ${{ secrets.TWITTER_CT0 }}
        run: xkit archive --all
      
      - name: Commit changes
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add bookmarks.md knowledge/
          git commit -m "Update bookmarks archive" || exit 0
          git push
```

## Troubleshooting

### No new bookmarks to process

This means either:

- No bookmarks were fetched (check credentials)
- All fetched bookmarks already exist in archive

To start fresh:

```bash
rm .xkit/state/bookmarks-state.json
xkit archive
```

### Enrichment is slow

Content extraction can be slow for many bookmarks. Options:

- Use `--skip-enrichment` for faster processing
- Process in smaller batches: `xkit archive -n 20`
- Increase concurrency (library usage only)

### Missing credentials

Run the setup wizard:

```bash
xkit setup
```

Or manually set environment variables:

```bash
export AUTH_TOKEN="your_token"
export CT0="your_ct0"
```

### Rate limiting

Twitter may rate-limit requests. The archive command automatically handles this, but you can:

- Process fewer bookmarks at a time
- Add delays between runs
- Use `--max-pages` to limit pagination

## Comparison with Smaug

xKit's bookmark archiving is inspired by [Smaug](https://github.com/alexknowshtml/smaug) but integrated directly into xKit:

| Feature | xKit | Smaug |
|---------|------|-------|
| URL expansion | ✅ | ✅ |
| Content extraction | ✅ | ✅ |
| Categorization | ✅ | ✅ |
| Markdown output | ✅ | ✅ |
| Knowledge base | ✅ | ✅ |
| State management | ✅ | ✅ |
| Setup wizard | ✅ | ✅ |
| Webhook notifications | ✅ | ✅ |
| Folder support | ✅ | ❌ |
| Media attachments | ✅ | ❌ |
| Stats tracking | ✅ | ❌ |
| Daemon mode | ✅ | ❌ |
| LLM analysis | ❌ | ✅ (Claude) |
| Parallel processing | ❌ | ✅ (Claude subagents) |
| Token tracking | ❌ | ✅ |

xKit focuses on the core archiving workflow without LLM dependencies, making it faster and more cost-effective. It also adds several features not in Smaug like folder support, media attachments, detailed statistics, and built-in daemon mode.

## Credits

Bookmark archiving features inspired by:

- [Smaug](https://github.com/alexknowshtml/smaug) by @alexknowshtml
- [bird CLI](https://github.com/steipete/bird) by @steipete

## License

MIT
