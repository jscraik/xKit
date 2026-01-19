# xKit v0.7.0: CLI Bookmark Archiving with AI - Launch Post

**Platform:** Codex (claude.ai/codex)
**Draft Date:** 2026-01-19
**Target Publish:** After evidence collection (2026-02-01 earliest)
**Status:** Draft - Ready for review

---

## Post Title
🚀 xKit v0.7.0: Archive X/Twitter Bookmarks to Your Personal Knowledge Base with Local AI

---

## Hook
What if you could turn your X/Twitter bookmarks into a searchable, AI-summarized personal knowledge base—with complete privacy and local processing?

---

## What is xKit?

xKit is a CLI tool for X/Twitter that helps you:
- **Archive bookmarks** to local markdown files
- **Organize by author or month** for easy retrieval
- **Summarize with local AI** (Ollama integration)
- **Extract full article content** from linked URLs
- **Categorize automatically** (GitHub repos, articles, videos, etc.)

---

## Why I Built This

I built xKit because I was tired of losing valuable content in my X/Twitter bookmarks. The platform's bookmark feature is great for saving things, but terrible for finding them later.

I wanted:
- ✅ **Local-first storage** (my data, my control)
- ✅ **Permanent access** (bookmarks can't be deleted or hidden)
- ✅ **Searchability** (grep through markdown files)
- ✅ **Privacy** (no cloud services, local AI only)
- ✅ **Flexibility** (organize how I want)

---

## How It Works

### Installation

```bash
npm install -g @brainwav/xkit
# or
brew install jscraik/tap/xkit
```

### Quick Start

```bash
# Interactive setup
xkit setup

# Archive all bookmarks with AI summarization
xkit archive --all

# Archive with statistics
xkit archive --stats
```

### What You Get

Each bookmark becomes a markdown file like this:

```markdown
---
id: "1234567890"
url: "https://x.com/user/status/1234567890"
author: "@username"
created_at: "2026-01-19T10:30:00Z"
category: "article"
tags: ["rust", "systems-programming"]
title: "Why Rust is the Future of Systems Programming"
source: "xkit"
ai_generated: true
ai_model: "qwen2.5:7b"
---

## Summary

This article argues that Rust's memory safety guarantees, zero-cost abstractions, and growing ecosystem make it ideal for systems programming.

## Key Points

- Rust eliminates entire classes of memory safety bugs
- Performance comparable to C/C++
- Cargo provides best-in-class package management
- Growing adoption in major tech companies

## Original Tweet

@username: Just published my deep dive on why Rust represents the future of systems programming. TL;DR: memory safety without performance trade-offs is a game changer.

## Expanded Content

[Full article content extracted and converted to markdown...]
```

---

## Key Features

### 🏷️ Smart Categorization
- GitHub repos → `repos/`
- Articles → `articles/`
- Videos → `videos/`
- Threads → `threads/`
- Plus 10+ more categories

### 🤖 Local AI Summarization
- Uses Ollama (no API keys, no cloud)
- 2-3 sentence summaries
- 3-5 key points per bookmark
- Optional (degrades gracefully if unavailable)

### 📄 Article Content Extraction
- Fetches full article content
- Converts to clean markdown
- Calculates reading time
- Extracts metadata (title, author, site name)

### 📁 Flexible Organization
- By author: `bookmarks/@user/tweet-id.md`
- By month: `bookmarks/2024-01/tweet-id.md`
- Custom output directories

### 📊 Statistics & Monitoring
- Track archiving progress
- View bookmark distribution by category
- Identify uncategorized items

---

## Demo

```bash
# Check credentials
xkit check

# View current user
xkit whoami

# Archive last 50 bookmarks
xkit archive --limit 50

# Archive with media attachments
xkit archive --include-media

# Send Discord notifications
xkit archive --webhook-url "https://discord.com/api/webhooks/..." --webhook-type discord

# Continuous archiving (daemon mode)
xkit daemon start --interval 30m
```

---

## Under the Hood

xKit is built with:
- **TypeScript + Node.js** for the CLI
- **Commander** for command parsing
- **Ollama** for local AI inference
- **@mozilla/readability** for article extraction
- **Turndown** for HTML→Markdown conversion

**Architecture highlights:**
- Cookie-based authentication (reads from Safari/Chrome/Firefox)
- X/Twitter GraphQL API access
- Incremental processing (only processes new bookmarks)
- Graceful degradation (works without AI)

---

## What's Next?

**Phase 1 (Current):**
- ✅ Bookmark archiving
- ✅ AI summarization
- ✅ Article extraction
- ✅ Smart categorization

**Phase 2 (Planned, conditional on evidence):**
- Community-driven features based on feedback
- Potential cloud AI options (OpenAI, Anthropic)
- Advanced search and filtering
- Parallel processing for large archives

---

## Known Limitations

- macOS-only for cookie extraction (Linux/Windows: manual auth)
- Uses undocumented X/Twitter GraphQL API (may break)
- AI requires local Ollama installation (2-4GB RAM)
- Sequential processing (slow for 1000+ bookmarks)

**See [LIMITATIONS.md](https://github.com/jscraik/xKit/blob/main/LIMITATIONS.md) for details.**

---

## Try It Out

```bash
npm install -g @brainwav/xkit
xkit setup
xkit archive --limit 10
```

**Repository:** https://github.com/jscraik/xKit
**Documentation:** https://github.com/jscraik/xKit#readme
**Issues:** https://github.com/jscraik/xKit/issues

---

## Feedback Wanted

This is an early release and I'm looking for feedback:
- What features would you use?
- What's broken or confusing?
- How do you organize your bookmarks?
- Would you use this for your knowledge base?

**Reply here with your thoughts, bug reports, or feature requests!**

---

## Transparency Note

This project shipped without prior user validation (violating evidence-first principles). I'm now actively seeking community feedback to validate the product direction before Phase 2 development.

See the [governance framework](https://github.com/jscraik/xKit/blob/main/.specs/GOVERNANCE.md) for details on the go/no-go decision process.

---

**Tags:** `cli-tools`, `twitter-x`, `knowledge-base`, `ai-summarization`, `local-first`, `privacy`, `typescript`, `developer-tools`
