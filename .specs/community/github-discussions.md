# xKit v0.7.0 - Tester Recruitment Discussion

**Platform:** GitHub Discussions
**Category:** Announcements / Show & Tell
**Draft Date:** 2026-01-19
**Target Publish:** After evidence collection (2026-02-01 earliest)
**Status:** Draft - Ready for review

---

## Title
🚀 xKit v0.7.0: Looking for beta testers for CLI bookmark archiving with local AI

---

## Post Body

Hey everyone! 👋

I've just released v0.7.0 of **xKit**, a CLI tool for archiving X/Twitter bookmarks to a local knowledge base with AI summarization. I'm looking for beta testers to try it out and provide feedback.

---

## What is xKit?

xKit is a command-line tool that:
- 📦 **Archives bookmarks** to local markdown files
- 🤖 **Summarizes with local AI** (Ollama - no API keys needed)
- 📄 **Extracts full article content** from linked URLs
- 🏷️ **Categorizes automatically** (repos, articles, videos, threads)
- 🔍 **Makes everything searchable** (grep through your knowledge base)

---

## Why I Built This

I was frustrated with X/Twitter's bookmark feature—great for saving, terrible for finding. I wanted:
- ✅ Local storage (my data, my control)
- ✅ Permanent access (bookmarks can't disappear)
- ✅ Searchability (grep through markdown)
- ✅ Privacy (no cloud services, local AI only)

---

## Quick Start

```bash
# Install
npm install -g @brainwav/xkit
# or
brew install jscraik/tap/xkit

# Setup
xkit setup

# Archive some bookmarks
xkit archive --limit 10

# View your knowledge base
ls ~/bookmarks/
```

---

## What I'm Looking For

I'm particularly interested in feedback from:

1. **Bookmark Power Users** (1000+ bookmarks)
   - Does the categorization work for you?
   - Is the performance acceptable?

2. **Knowledge Base Builders** (Obsidian, Notion, etc.)
   - Does the markdown format work with your workflow?
   - What metadata would help?

3. **Privacy-Conscious Developers**
   - Is local-first storage important to you?
   - Would you trust this with your bookmarks?

4. **CLI/Scripting Enthusiasts**
   - Is the JSON output useful for scripting?
   - What other output formats would help?

---

## Known Issues

**Platform Limitations:**
- Cookie extraction only works on macOS (Linux/Windows users need manual auth)

**Performance:**
- Sequential processing (slow for 1000+ bookmarks)
- AI summarization adds ~10-30s per bookmark

**API Risks:**
- Uses undocumented X/Twitter GraphQL API (may break without notice)

**See [LIMITATIONS.md](https://github.com/jscraik/xKit/blob/main/LIMITATIONS.md) for details.**

---

## What I'd Love to Know

1. **Does this solve a real problem for you?**
   - How do you currently organize bookmarks?
   - What would make this useful?

2. **What's broken or confusing?**
   - Installation issues?
   - Error messages unclear?
   - Features missing?

3. **What features would you use?**
   - Cloud AI options (OpenAI, Anthropic)?
   - Parallel processing?
   - Advanced search/filtering?

4. **Would you recommend this?**
   - To whom? Why? Why not?

---

## How to Participate

1. **Install and try it out:**
   ```bash
   npm install -g @brainwav/xkit
   xkit setup
   xkit archive --limit 10
   ```

2. **Report issues:**
   - GitHub Issues: https://github.com/jscraik/xKit/issues
   - Use the `bug` label for problems
   - Use the `enhancement` label for feature requests

3. **Share your experience:**
   - Reply here with your thoughts
   - What worked well?
   - What didn't?
   - What would make this a 5-star tool?

---

## Transparency Note

This project shipped without prior user validation (violating evidence-first principles). I'm now actively seeking community feedback to validate the product direction before Phase 2 development.

**See the [governance framework](https://github.com/jscraik/xKit/blob/main/.specs/GOVERNANCE.md) for details on the go/no-go decision process.**

---

## Links

- **GitHub:** https://github.com/jscraik/xKit
- **Documentation:** https://github.com/jscraik/xKit#readme
- **Troubleshooting:** https://github.com/jscraik/xKit/blob/main/docs/troubleshooting.md
- **Limitations:** https://github.com/jscraik/xKit/blob/main/LIMITATIONS.md

---

## Thank You! 🙏

If you've read this far, thank you for considering being a beta tester. Your feedback will directly shape the future of this project.

**Reply here or open an issue with your thoughts!**

---

**Labels:** `feedback`, `beta`, `v0.7.0`, `community`
**Pinned:** Yes (for 30 days or until sufficient feedback collected)
