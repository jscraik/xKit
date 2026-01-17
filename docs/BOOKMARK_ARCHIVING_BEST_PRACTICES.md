# Bookmark Archiving Best Practices

## How State Management Works

xKit tracks processed bookmarks in `.xkit/state/bookmarks-state.json` to avoid re-processing the same bookmarks on subsequent runs.

### State File Contents

```json
{
  "lastExportTimestamp": "2026-01-17T18:32:28.162Z",
  "lastBookmarkId": "1726948680714817885",
  "processedBookmarkIds": ["2012140031700603071", "..."],
  "totalProcessed": 435
}
```

### Default Behavior (Incremental)

By default, xKit **skips already processed bookmarks**:

```bash
pnpm run dev bookmarks-archive --all --organize-by-month
```

Output:

```
✅ Fetched 435 bookmarks
⏭️  Skipped 434 already processed bookmarks
📝 Processing 1 bookmarks...
```

This is **efficient** and **fast** - only new bookmarks are processed.

## Best Practices

### 1. Daily/Regular Archiving (Recommended)

**Use case:** Keep your knowledge base up-to-date with new bookmarks

```bash
# Run daily (via cron or manually)
pnpm run dev bookmarks-archive --all --organize-by-month
```

**Benefits:**

- ✅ Only processes new bookmarks (fast)
- ✅ Preserves existing files
- ✅ No duplicate processing
- ✅ Low API usage

**When to use:**

- Daily/weekly bookmark archiving
- Continuous knowledge base maintenance
- Automated workflows

### 2. Thread Fetching (New!)

**Use case:** Capture full Twitter threads when bookmarking the first tweet

```bash
# Fetch full threads for bookmarked tweets
pnpm run dev bookmarks-archive --all --organize-by-month --fetch-threads
```

**Benefits:**

- ✅ Captures complete conversation context
- ✅ Includes all tweets in the thread
- ✅ Shows replies from other users
- ✅ Preserves thread structure with numbering

**Example output:**

```markdown
## @UiSavior - Grid systems: boring until you actually understand...

**Thread:**

### 1/14
> Grid systems: boring until you actually understand them.🧵

— @UiSavior (UI/UX Savior)
*Jan 17, 2026, 08:01 AM*

### 2/14
> [Next tweet in thread...]

— @UiSavior (UI/UX Savior)
*Jan 17, 2026, 08:01 AM*
```

**Performance:**

- ⚠️ Slower (additional API call per bookmark)
- ⚠️ Higher API usage (fetches thread for each tweet)
- ✅ Worth it for valuable threads

**When to use:**

- When bookmarking educational threads
- For comprehensive knowledge capture
- When context matters (multi-tweet explanations)

### 3. Force Re-processing

**Use case:** Re-extract content with updated enrichment or after fixing bugs

```bash
# Re-process ALL bookmarks (ignores state)
pnpm run dev bookmarks-archive --all --organize-by-month --force
```

**Benefits:**

- ✅ Updates existing files with new content
- ✅ Applies new categorization rules
- ✅ Re-extracts with improved extractors

**Drawbacks:**

- ⚠️ Slow (processes all 435+ bookmarks)
- ⚠️ High API usage
- ⚠️ May hit rate limits

**When to use:**

- After updating categorization rules
- After fixing content extraction bugs
- When you want fresh summaries with a different AI model
- When files were accidentally deleted

### 4. Fresh Start (Reset State)

**Use case:** Start completely fresh, ignoring all previous processing

```bash
# Delete state file
rm .xkit/state/bookmarks-state.json

# Run archive
pnpm run dev bookmarks-archive --all --organize-by-month
```

**When to use:**

- Testing new features
- Debugging state issues
- Complete knowledge base rebuild

### 5. Specific Count (Testing)

**Use case:** Test with a small batch

```bash
# Process only 10 bookmarks
pnpm run dev bookmarks-archive --count 10 --organize-by-month
```

**When to use:**

- Testing new features
- Verifying configuration
- Quick checks

## Recommended Workflows

### Daily Automation (Cron Job)

```bash
#!/bin/bash
# ~/.local/bin/archive-bookmarks.sh

cd ~/dev/xKit
op run --env-file=".env.template" -- pnpm run dev bookmarks-archive \
  --all \
  --organize-by-month \
  --fetch-threads \
  --summarize \
  --ollama-model qwen2.5:7b

# Optional: Commit to git
git add knowledge/
git commit -m "chore: update bookmarks $(date +%Y-%m-%d)" || true
git push || true
```

Add to crontab:

```bash
# Run daily at 9 AM
0 9 * * * ~/.local/bin/archive-bookmarks.sh >> ~/logs/bookmarks.log 2>&1
```

### Weekly Deep Archive (with AI and Threads)

```bash
# Every Sunday, re-process with AI summaries and thread fetching
pnpm run dev bookmarks-archive \
  --all \
  --organize-by-month \
  --fetch-threads \
  --summarize \
  --ollama-model qwen2.5:7b \
  --force
```

### Monthly Cleanup

```bash
# First of each month: fresh archive with latest features
rm .xkit/state/bookmarks-state.json
pnpm run dev bookmarks-archive \
  --all \
  --organize-by-month \
  --summarize
```

## State Management Commands

### Check State

```bash
# View current state
cat .xkit/state/bookmarks-state.json | python3 -m json.tool | head -20
```

### Count Processed

```bash
# Count processed bookmarks
cat .xkit/state/bookmarks-state.json | \
  python3 -c "import sys, json; print(len(json.load(sys.stdin)['processedBookmarkIds']))"
```

### Reset State

```bash
# Start fresh
rm .xkit/state/bookmarks-state.json
```

### Backup State

```bash
# Before major changes
cp .xkit/state/bookmarks-state.json .xkit/state/bookmarks-state.backup.json
```

## Performance Considerations

### Incremental (Default)

- **Speed:** Fast (1-5 seconds for new bookmarks)
- **API calls:** Minimal (only new bookmarks)
- **Disk I/O:** Low (only new files)

### Force Re-processing

- **Speed:** Slow (5-10 minutes for 435 bookmarks)
- **API calls:** High (all bookmarks)
- **Disk I/O:** High (all files rewritten)

### With AI Summarization

- **Speed:** Very slow (1-2 seconds per bookmark)
- **Total time:** ~7-15 minutes for 435 bookmarks
- **Ollama:** Local processing (no API costs)

## Troubleshooting

### "Skipped all bookmarks"

**Problem:** All bookmarks already processed

**Solution:**

```bash
# Option 1: Wait for new bookmarks
# Option 2: Force re-process
pnpm run dev bookmarks-archive --all --force

# Option 3: Reset state
rm .xkit/state/bookmarks-state.json
```

### "Missing files but state shows processed"

**Problem:** Files deleted but state still tracks them

**Solution:**

```bash
# Re-process with force
pnpm run dev bookmarks-archive --all --organize-by-month --force
```

### "Want to update AI summaries"

**Problem:** Already processed but want new summaries

**Solution:**

```bash
# Force re-process with summarization
pnpm run dev bookmarks-archive \
  --all \
  --organize-by-month \
  --summarize \
  --ollama-model qwen2.5:7b \
  --force
```

## Summary

**For daily use:** Run without `--force` (fast, incremental)

```bash
pnpm run dev bookmarks-archive --all --organize-by-month
```

**For updates:** Use `--force` when you need to refresh content

```bash
pnpm run dev bookmarks-archive --all --organize-by-month --force
```

**For fresh start:** Delete state file and re-run

```bash
rm .xkit/state/bookmarks-state.json
pnpm run dev bookmarks-archive --all --organize-by-month
```
