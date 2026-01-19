# Release Notes Draft: xKit v0.7.0

**Version:** 0.7.0
**Release Date:** 2026-02-01 (conditional)
**Status:** 📝 DRAFT - Pending go/no-go decision
**Last Updated:** 2026-01-19

---

## Headline

# 🚀 xKit v0.7.0 - AI-Powered Bookmark Archiving for X

**Turn your X bookmarks into a searchable knowledge base with local AI summaries.**

---

## Value Proposition

xKit is a fast, developer-first CLI for X/Twitter that transforms your bookmarks into a durable, searchable markdown archive. Version 0.7.0 introduces AI-powered article extraction and summarization—running entirely on your machine.

**What makes xKit different:**
- 🔒 **Privacy-first:** All processing happens locally. Your bookmarks never leave your machine.
- 🤖 **AI-powered:** Optional local AI summaries help you quickly assess content relevance.
- 📝 **Developer-friendly:** Scriptable JSON output and stable schemas for automation.
- 🏗️ **Built to last:** Deterministic markdown output survives API changes and platform volatility.

---

## What's New in v0.7.0

### Phase 1 Enhancements (2026-01-17)

**📄 Full Article Content Extraction**
- Automatically extracts full article content from bookmarked URLs
- Uses Mozilla Readability for clean, reliable content extraction
- Converts HTML to markdown for easy reading and archival
- Calculates reading time and word count

**🤖 Local AI Summarization**
- Optional AI-powered article summaries using Ollama
- Generates 2-3 sentence summaries and key bullet points
- Runs entirely on your machine—no API keys required
- Graceful fallback when AI is unavailable

**📁 Enhanced Organization**
- Organize bookmarks by month (`jan_2026/` style directories)
- Organize bookmarks by author handle for curated feeds
- Flexible categorization and custom folder structures

**🔗 Improved Thread Support**
- Enhanced thread fetching for complete conversation context
- Better reply chain reconstruction

---

## MVP Features (From Earlier Releases)

**CLI Commands**
- `xkit read <id>` - Read a tweet by ID
- `xkit search <query>` - Search X/Twitter
- `xkit thread <id>` - Get full thread conversation
- `xkit bookmarks` - Fetch your bookmarks
- `xkit archive` - Create markdown archive from bookmarks
- `xkit mentions` - Get your mentions
- `xkit news` - Get trending news
- `xkit lists` - Manage your lists
- `xkit query-ids` - Refresh cached GraphQL query IDs
- `xkit setup` - Guided first-run setup wizard

**Output Modes**
- Default: Formatted terminal output with colors and emoji
- `--json`: Stable JSON schema for scripting
- `--plain`: No ANSI, no emoji for accessibility/tools

---

## Use Cases

### Use Case 1: Build a Personal Knowledge Base

Transform your X bookmarks into a searchable markdown archive:

```bash
# Archive all bookmarks with AI summaries
xkit archive --all --summarize

# Organize by month
xkit archive --all --organize-by-month

# Organize by author
xkit archive --all --organize-by-author
```

**Output:** Markdown files in `./knowledge/` with full article content and AI summaries.

---

### Use Case 2: Quick Content Assessment

Use AI summaries to quickly assess bookmark relevance:

```bash
# Archive with summaries
xkit archive --max-pages 5 --summarize

# Output includes:
# - Original tweet
# - Full article content (extracted)
# - AI-generated 2-3 sentence summary
# - Key points as bullets
# - Reading time estimate
```

**Benefit:** Process hundreds of bookmarks in minutes, not hours.

---

### Use Case 3: Scriptable Automation

Use JSON output for automation and integrations:

```bash
# Get bookmarks as JSON
xkit bookmarks --json > bookmarks.json

# Filter with jq
xkit bookmarks --json | jq '.data[] | select(.category == "tech")'

# Archive specific categories
xkit archive --category tech,programming --output-dir ./tech-knowledge
```

**Benefit:** Integrate with your existing scripts and workflows.

---

## Getting Started

### Installation

```bash
# Via npm (recommended)
npm install -g @jcraik/xkit

# Via Homebrew (macOS/Linux)
brew install jcraik/tap/xkit

# Via pnpm
pnpm add -g @jcraik/xkit
```

---

### First-Time Setup

```bash
# Run the setup wizard
xkit setup

# The wizard will prompt you for:
# - X/Twitter cookies (auth_token + ct0)
# - Output directory preferences
# - Default options
```

**Where to get cookies:**
1. Log into X/Twitter in your browser
2. Open Developer Tools (F12)
3. Go to Application > Cookies > https://x.com
4. Copy `auth_token` and `ct0` values

---

### Basic Usage

```bash
# Archive your bookmarks
xkit archive

# Archive with AI summaries (requires Ollama)
xkit archive --summarize

# Read a tweet
xkit read 1234567890

# Search
xkit search "typescript"

# Get a thread
xkit thread 1234567890
```

---

### Optional: Local AI Setup

For AI-powered summaries, install Ollama:

```bash
# Install Ollama (macOS/Linux)
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (recommended: qwen2.5:7b)
ollama pull qwen2.5:7b

# Start Ollama (if not running automatically)
ollama serve

# Test with xKit
xkit archive --summarize --model qwen2.5:7b
```

**Models tested:**
- `qwen2.5:7b` (recommended, ~4GB RAM)
- `llama3.2:3b` (lighter alternative, ~2GB RAM)

---

## Known Limitations

**⚠️ Evidence-First Phase**
- This release is part of an evidence-first development approach
- We're seeking user feedback to validate demand for these features
- Future development (Phase 2) depends on community engagement
- Please provide feedback via GitHub Issues or Discussions

**🔒 Cookie-Based Authentication**
- Uses browser cookies for authentication (no official API)
- May break if X/Twitter changes authentication
- Recovery: Re-run `xkit setup` with fresh cookies
- See troubleshooting section below

**🤖 AI Features Are Optional**
- AI summarization requires Ollama to be installed and running
- Falls back gracefully if Ollama is unavailable
- Models require 2-4GB RAM
- First-time setup may take a few minutes

**📄 Article Extraction**
- Not all websites support content extraction
- Some sites may block automated fetching
- Paywalled content cannot be accessed
- Extraction quality varies by site structure

---

## Troubleshooting

### "Authentication failed" Error

**Problem:** Cookies expired or invalid

**Solution:**
```bash
# Refresh cookies
xkit setup

# Or manually update config
# ~/.config/xkit/config.json
```

---

### "Ollama not available" Warning

**Problem:** Ollama is not installed or not running

**Solution:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama
ollama serve

# Or use without AI
xkit archive (without --summarize flag)
```

---

### "Query ID not valid" Error

**Problem:** X/Twitter changed GraphQL query IDs

**Solution:**
```bash
# Refresh query IDs
xkit query-ids --fresh

# If that fails, check for GitHub issues
# or open a new issue
```

---

### Article Extraction Fails

**Problem:** Website blocks automated fetching or has unusual structure

**Solution:**
- Falls back to basic bookmark entry
- Try manually fetching the URL
- Some sites cannot be extracted (paywalls, auth walls)

---

## Performance

**Typical performance:**
- Bookmark fetch: ~1-2 seconds per page
- Article extraction: ~2-5 seconds per article
- AI summarization: ~10-30 seconds per article (model-dependent)
- CLI startup: <1 second

**Resource usage (AI features):**
- Ollama models: 2-4GB RAM
- CPU usage varies by model and hardware
- Consider batch size for large archives

---

## Documentation

- **README:** [github.com/jcraik/xkit](https://github.com/jcraik/xkit)
- **Full Docs:** [github.com/jcraik/xkit/blob/main/docs/](https://github.com/jcraik/xkit/blob/main/docs/)
- **Issue Tracker:** [github.com/jcraik/xkit/issues](https://github.com/jcraik/xkit/issues)
- **Discussions:** [github.com/jcraik/xkit/discussions](https://github.com/jcraik/xkit/discussions)

---

## Roadmap

**Current Focus:** Evidence validation and community feedback

**Phase 2 (Planned, Blocked on Evidence):**
- Video transcript extraction
- Enhanced search and filtering
- Export formats (JSON, Obsidian, Notion)

**Have feedback?** Please open an issue or join the discussion!

---

## Contributing

We're looking for:
- Beta testers
- Feedback on features
- Bug reports
- Feature requests

**See:** [CONTRIBUTING.md](https://github.com/jcraik/xkit/blob/main/CONTRIBUTING.md)

---

## Acknowledgments

**Beta Testers:**
- [List names after testing complete]

**Contributors:**
- Jamie Craik - Creator and maintainer

**Tools and Libraries:**
- Mozilla Readability - Content extraction
- Ollama - Local AI inference
- Turndown - HTML to Markdown conversion
- Commander.js - CLI framework

---

## License

MIT License - see [LICENSE](https://github.com/jcraik/xkit/blob/main/LICENSE) for details.

---

## Changelog

### v0.7.0 (2026-02-01)

**Added:**
- Full article content extraction via Mozilla Readability
- Local AI summarization using Ollama
- Month-based organization (`--organize-by-month`)
- Author-based organization (`--organize-by-author`)
- Enhanced thread fetching
- Reading time and word count calculation

**Changed:**
- Improved error messages and guidance
- Better graceful degradation for optional features

**Fixed:**
- Various bug fixes and stability improvements

### v0.6.0 and Earlier

See [CHANGELOG.md](https://github.com/jcraik/xkit/blob/main/CHANGELOG.md) for full history.

---

## Support

**Questions?**
- GitHub Issues: [github.com/jcraik/xkit/issues](https://github.com/jcraik/xkit/issues)
- GitHub Discussions: [github.com/jcraik/xkit/discussions](https://github.com/jcraik/xkit/discussions)

**Star ⭐️ if you find xKit useful!**

---

## Quick Reference

```bash
# Install
npm install -g @jcraik/xkit

# Setup
xkit setup

# Archive
xkit archive
xkit archive --summarize
xkit archive --organize-by-month
xkit archive --organize-by-author

# Read
xkit read <id>
xkit thread <id>
xkit search <query>

# JSON output
xkit bookmarks --json
xkit archive --json

# Help
xkit --help
xkit archive --help
```

---

**Release Status:** 📝 DRAFT - Pending go/no-go decision (2026-01-29)
**Release Date:** 2026-02-01 (conditional)
**Version:** 0.7.0
