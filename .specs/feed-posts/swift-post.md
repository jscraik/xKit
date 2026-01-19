# xKit v0.7.0 - Swift Feed Post

**Platform:** Swift (swift.org/community)
**Draft Date:** 2026-01-19
**Target Publish:** After evidence collection (2026-02-01 earliest)
**Status:** Draft - Ready for review

---

## Title
🔧 New Tool: CLI Bookmark Archiving with Local AI for Knowledge Base Workflows

---

## Content

Fellow Swift developers,

I wanted to share a CLI tool I've been working on that might be useful for those of you who bookmark content on X/Twitter and want better ways to organize it.

### The Problem

Like many of you, I bookmark tweets and threads constantly—code snippets, articles, announcements, discussions. But X/Twitter's bookmark feature is basically a black hole. Once you save something, good luck finding it again.

### The Solution

**xKit** - a CLI tool that:
1. Archives your bookmarks to local markdown files
2. Extracts full article content from linked URLs
3. Summarizes with local AI (Ollama - no API keys)
4. Categorizes automatically (repos, articles, videos, threads)
5. Organizes by author or date

### Quick Example

```bash
# Install
brew install jscraik/tap/xkit

# Archive with AI summaries
xkit archive --all

# Search your knowledge base
grep -r "SwiftUI" ~/bookmarks/
```

### Why This Might Interest You

- **Local-first** - Your data stays on your machine
- **Searchable** - Plain markdown files, use any tool
- **Privacy** - No cloud services, AI runs locally
- **Developer-friendly** - JSON output, scriptable CLI

### What I Learned Building This

As a Swift-focused developer, building this in TypeScript was interesting. The architecture patterns we use in SwiftUI (clear data flow, composable components) translated well to CLI design:

- **Cookie authentication** → Similar to keychain access patterns
- **Incremental processing** → Like diffable data sources
- **Error handling** → Clear error types with recovery options

### Known Limitations

- macOS-only for cookie extraction (Linux/Windows requires manual auth)
- Sequential processing (slow for 1000+ bookmarks)
- Requires Ollama for AI features (optional but recommended)

### Feedback Welcome

This is an early release (v0.7.0) and I'm actively looking for feedback:
- Does this solve a real problem for you?
- What features would make this useful?
- How do you currently organize your bookmarks?

### Try It Out

```bash
brew install jscraik/tap/xkit
xkit setup
xkit archive --limit 5  # Test with a few bookmarks
```

**GitHub:** https://github.com/jscraik/xKit

Reply if you try it out or have questions!

---

**Tags:** `developer-tools`, `cli`, `productivity`, `knowledge-management`
