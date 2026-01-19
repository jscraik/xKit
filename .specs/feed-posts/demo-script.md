# xKit v0.7.0 - Demo Recording Script

**Purpose:** Terminal recording for launch posts and documentation
**Duration:** ~60-90 seconds
**Date:** 2026-01-19
**Status:** Draft - Ready for recording

---

## Recording Setup

**Terminal:**
- Font: SF Mono or JetBrains Mono (14pt)
- Theme: Dark background, high contrast
- Size: 1280x720 (720p) or 1920x1080 (1080p)
- Tool: asciinema, terminalizer, or QuickTime with Terminal

**Preparation:**
```bash
# Clean terminal state
clear

# Set up demo environment
cd ~/tmp/xkit-demo
rm -rf bookmarks
export DEMO_MODE=1
```

---

## Script

### Scene 1: Installation (10s)

```bash
# Show current directory
pwd

# Install xKit
npm install -g @brainwav/xkit

# Verify installation
xkit --version
```

**Expected Output:**
```
/tmp/xkit-demo
0.7.0 (abcdef12)
```

---

### Scene 2: Credential Check (5s)

```bash
# Check authentication status
xkit check
```

**Expected Output:**
```
✓ Credentials found
  Source: Safari cookies
  Account: @username
```

---

### Scene 3: Interactive Setup (10s)

```bash
# Run interactive setup
xkit setup
```

**Expected Output:**
```
🔧 xKit Setup Wizard

? Output directory: ~/bookmarks
? Enable AI summarization? Yes
? Ollama model: qwen2.5:7b
? Organization mode: By author

✓ Configuration saved to ~/.config/xkit/config.json5
```

---

### Scene 4: Archive Command (15s)

```bash
# Archive recent bookmarks
xkit archive --limit 10 --stats
```

**Expected Output:**
```
📦 Archiving bookmarks...

Fetching bookmarks: 10 found
Processing: [████████████████████] 10/10

📊 Archive Statistics:
  Total processed: 10
  Articles: 4
  GitHub repos: 2
  Videos: 1
  Threads: 2
  Other: 1

✓ Archive complete
  Output: ~/bookmarks/
  Duration: 12.3s
```

---

### Scene 5: View Output (15s)

```bash
# Show archive structure
tree bookmarks -L 2

# View a sample file
cat bookmarks/@username/1234567890.md
```

**Expected Output:**
```
bookmarks/
├── @user1/
│   ├── 1234567890.md
│   └── 1234567891.md
├── @user2/
│   └── 1234567892.md
└── by-month/
    └── 2026-01/
        └── 1234567893.md

---
id: "1234567890"
url: "https://x.com/user/status/1234567890"
author: "@user1"
created_at: "2026-01-19T10:30:00Z"
category: "article"
ai_generated: true
---

## Summary

This article explores advanced SwiftUI animations...

## Key Points

- SwiftUI animations are declarative
- Matched geometry effects simplify transitions
- Custom timing curves are powerful

[... more content ...]
```

---

### Scene 6: AI Features (10s)

```bash
# Show AI capabilities
xkit archive --limit 1 --verbose | grep -A 5 "AI Summary"
```

**Expected Output:**
```
🤖 AI Processing (Ollama)
  Model: qwen2.5:7b
  Status: Connected

📝 AI Summary:
  This thread discusses SwiftUI performance optimization
  techniques for large list views.

💡 Key Points:
  • Use LazyVStack for large lists
  • Avoid @Published in high-frequency updates
  • Profile with Instruments
```

---

### Scene 7: Search Capabilities (10s)

```bash
# Search the archive
grep -r "SwiftUI" bookmarks/ --include="*.md" | head -3

# Count by category
find bookmarks/ -name "*.md" -exec head -1 {} \; | grep category | sort | uniq -c
```

**Expected Output:**
```
bookmarks/@user1/1234567890.md:## SwiftUI Animation Best Practices
bookmarks/@user2/1234567891.md:Learned a lot about SwiftUI...
bookmarks/@user3/1234567892.md:New SwiftUI tutorial...

   4 category: "article"
   2 category: "repo"
   1 category: "video"
```

---

### Scene 8: Help & Documentation (5s)

```bash
# Show available commands
xkit --help

# Point to full docs
echo "📚 Full docs: https://github.com/jscraik/xKit#readme"
```

---

## Closing Frame

Hold for 3 seconds on:

```bash
# Final message
echo "✅ xKit v0.7.0 - Archive bookmarks with local AI"
echo "🔗 github.com/jscraik/xKit"
```

---

## Editing Notes

**Post-Processing:**
1. Trim leading/trailing silence
2. Add speed ramping (1x normal, 2x for scrolling output)
3. Add text overlays for key commands
4. Add background music (optional, low volume)

**Text Overlays:**
- Scene 1: "Installation via npm"
- Scene 2: "Cookie-based auth"
- Scene 3: "Interactive setup wizard"
- Scene 4: "Archive with AI summarization"
- Scene 5: "Organized markdown output"
- Scene 6: "Local AI with Ollama"
- Scene 7: "Searchable knowledge base"
- Scene 8: "Get started today"

**Transitions:**
- Cut between scenes
- Fade in/out for opening/closing
- Zoom on code examples

---

## Alternative: Short Version (30s)

For Twitter/X posts or quick demos:

```bash
# Setup (skip)
xkit archive --limit 5 --stats

# Show output (fast)
ls -la bookmarks/
cat bookmarks/@user/*.md | head -20

# Search demo
grep -r "keyword" bookmarks/

# CTA
echo "Install: brew install jscraik/tap/xkit"
```

---

## Recording Checklist

- [ ] Terminal font and theme configured
- [ ] Demo environment prepared (clean state)
- [ ] Credentials verified (logged into X/Twitter)
- [ ] Ollama running (for AI features)
- [ ] Output directory cleaned
- [ ] Script rehearsed once
- [ ] Recording tool tested
- [ ] Sufficient disk space for recording

---

## Export Settings

**For web (GitHub, etc.):**
- Format: MP4 (H.264)
- Resolution: 1280x720
- Bitrate: 5 Mbps
- Frame rate: 30 fps

**For social media:**
- Format: MP4 (H.264)
- Resolution: 1080x1920 (9:16 for mobile) or 1080x1080 (1:1)
- Bitrate: 8 Mbps
- Frame rate: 30 fps
