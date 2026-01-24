# User Profile Archiving - Current Status

## ✅ What's Been Created

### Scripts

1. **`scripts/archive-user-profile.mjs`** - One-time user profile archiving
2. **`scripts/archive-user-daemon.mjs`** - Continuous daemon for multiple users
3. **`examples/archive-config.json`** - Sample configuration
4. **`examples/user-profile-archive-example.sh`** - Demo script

### Documentation

1. **`docs/user-profile-archiving.md`** - Complete user guide
2. **`scripts/README.md`** - Script documentation
3. **Updated main README.md** - Added user profile archiving section

### Features

- ✅ One-time archiving with `--all` flag (up to 3200 tweets)
- ✅ Continuous daemon with state tracking
- ✅ Incremental archiving (only new tweets)
- ✅ Daily markdown files organized by user
- ✅ JSON and markdown output formats
- ✅ Configurable intervals and limits

## ⚠️ Current Issue

The Twitter search API endpoint is currently returning 404 errors. This is a known issue with Twitter's undocumented GraphQL API - query IDs rotate frequently.

**Error:** `HTTP 404` when running `xkit search "from:username"`

## 🔧 Workarounds

### Option 1: Use Bookmarks (Recommended)

Since your xKit is configured with cookies and bookmarks work:

1. **Bookmark tweets from @jh3yy** on X/Twitter
2. **Archive your bookmarks** using xKit's working bookmark archiving:

```bash
# Archive all your bookmarks (including @jh3yy's tweets)
pnpm xkit bookmarks --all --json > knowledge/my-bookmarks.json

# Or use the full bookmark archiving system
pnpm xkit archive --all
```

1. **Filter by author** in the JSON output:

```bash
# Extract just @jh3yy's tweets
cat knowledge/my-bookmarks.json | jq '.[] | select(.author.username == "jh3yy")'
```

### Option 2: Wait for API Fix

The search API issue may resolve when:

- Twitter updates their GraphQL endpoints
- Query IDs are refreshed (happens periodically)
- xKit is updated with new query ID mappings

### Option 3: Manual Collection

For now, you can:

1. Manually bookmark @jh3yy's tweets you want to save
2. Use `xkit archive` to save them to your knowledge base
3. The bookmark archiving system includes:
   - Automatic categorization
   - Content extraction
   - Media handling
   - Organized markdown output

## 📊 What You Can Do Now

### Archive Your Bookmarks

```bash
# Interactive setup
pnpm xkit setup

# Archive all bookmarks
pnpm xkit archive --all

# Continuous archiving
pnpm xkit daemon start --interval 30m
```

### Check What's Working

```bash
# Verify authentication
pnpm xkit whoami

# Test bookmarks (this works!)
pnpm xkit bookmarks -n 5

# Check your likes
pnpm xkit likes -n 5
```

## 🔮 Future Solutions

Once the search API is fixed, you'll be able to:

```bash
# Archive all of @jh3yy's available tweets
node scripts/archive-user-profile.mjs @jh3yy --all

# Continuous archiving of multiple users
node scripts/archive-user-daemon.mjs --users @jh3yy,@addyosmani --interval 60
```

## 📝 Technical Details

### What Was Fixed

- ✅ TypeScript compilation error in `writer.ts`
- ✅ Search API method changed from POST to GET
- ✅ Added `--all` flag for maximum tweet retrieval
- ✅ Query ID refresh mechanism

### What's Blocked

- ❌ Search API returning 404 (Twitter API issue)
- ❌ Need updated query IDs for SearchTimeline endpoint

### Files Modified

- `src/lib/twitter-client-search.ts` - Fixed API call method
- `src/bookmark-markdown/writer.ts` - Fixed variable scope
- `scripts/archive-user-profile.mjs` - Added --all flag
- `README.md` - Added user profile archiving section

## 💡 Recommendation

**For collecting @jh3yy's code snippets right now:**

1. Go to <https://x.com/jh3yy>
2. Bookmark the tweets with code snippets you want
3. Run: `pnpm xkit archive --all`
4. Your bookmarks will be saved to `knowledge/` with:
   - Organized by category
   - Full tweet text (including code)
   - Media links
   - Metadata

This gives you the same result - a knowledge base of @jh3yy's code snippets - just using bookmarks instead of search.

## 🆘 Need Help?

- Check authentication: `pnpm xkit check`
- Refresh query IDs: `pnpm xkit query-ids --fresh`
- View documentation: `docs/bookmark-archiving.md`
- Report issues: GitHub issues

---

**Last Updated:** 2026-01-23
**Status:** Search API blocked, bookmark archiving fully functional
