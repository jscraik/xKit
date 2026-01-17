---
title: "DocSetQuery"
type: "tool"
date_added: "Fri Jan 16 03:52:39 +0000 2026"
source: "https://github.com/PaulSolt/DocSetQuery"
tags: ["Python"]
via: "Twitter bookmark from @PaulSolt"
author: "PaulSolt"
url: "https://github.com/PaulSolt/DocSetQuery"
---

# DocSetQuery

Tooling for Agents to Create Markdown Documentation from DocSet Bundles

## Metadata

- **Stars:** 63
- **Language:** Python

## README

# DocSetQuery

![DocSetQuery hero](hero.png)

Local-first Apple documentation extraction, cleanup, and search. Built for fast developer lookup and agent workflows that need deterministic, citeable Markdown instead of scraping the web.

This repo is a working toolkit and a work in progress. Not all planned features are fully implemented yet. It assumes you already have the Apple API Reference docset (Dash docset) on disk and a `brotli` CLI available.

## Why this exists
- Apple docs are large and dynamic; agents need stable, local references.
- DocC exports are noisy; we need predictable front matter and trimmed tables of contents.
- Local search should be instant, without re-reading docsets for every query.

## What you get
- `tools/docset_query.py` — exports DocC content from the Apple docset to Markdown.
- `tools/docset_sanitize.py` — rebuilds front matter + trims the TOC for cleaner context.
- `tools/docindex.py` — builds a local JSON index for fast search by heading/key sections.
- `tools/docmeta.py` — peeks front matter/TOC quickly for debugging.
- `scripts/sync_docs.sh` — syncs a canonical docs cache into `docs/apple` (repo cache is gitignored).

## Quickstart (local)
```bash
# Export a framework/topic tree to Markdown
python tools/docset_query.py export \
  --root /documentation/vision \
  --output docs/apple/vision.md

# Sanitize the export (trim TOC, rebuild front matter)
python tools/docset_sanitize.py --input docs/apple/vision.md --in-place --toc-depth 2

# Build or refresh the search index
python tools/docindex.py rebuild

# Search headings/key sections
python tools/docindex.py search "CVPixelBuffer"
```

## Agent workflow (how we use it)
This is the flow we use in other repos that need grounded Apple citations:
1. **Search locally first.** Agents call `docindex.py search` against `docs/apple`.
2. **Fetch only what’s missing.** If the topic isn’t there, use `docset_query.py fetch` or `export`.
3. **Sanitize for stable context.** Run `docset_sanitize.py` to keep front matter and TOC consistent.
4. **Rebuild the index.** `docindex.py rebuild` keeps agent search fast and deterministic.
5. **Keep a canonical cache.** Sync with `scripts/sync_docs.sh` so `docs/apple` stays a lightweight, shareable cache without committing the full docset.

This approach lets agents answer questions with local, vetted Markdown and avoids hitting remote docs during runs.

## How it works
### Docset export (`tools/docset_query.py`)
- Reads the Dash Apple API Reference docset directly (SQLite + brotli chunks).
- Commands:
  - `export` — walk a documentation tree and emit a single Markdown file.
  - `fetch` — render a single symbol/topic (optionally to stdout).
  - `init` — prebuild manifests for faster traversal.
- Defaults:
  - Docset path: `~/Library/Application Support/Dash/DocSets/Apple_API_Reference/Apple_API_Reference.docset`
  - Language: `swift`
  - Cache: `~/.cache/apple-docs`
  - `export` depth: 7, `fetch` depth: 1
- Overrides:
  - `--docset` or `DOCSET_ROOT` for alternate docsets
  - `--language` for alternate language variants
  - `DOCSET_CACHE_DIR` for cache location

### Sanitize exports (`tools/docset_sanitize.py`)
- Rebuilds front matter with a stable summary and key sections.
- Trims TOC depth and drops noisy stopwords (e.g. “discussion”, “parameters”).
- Keeps output deterministic so agent prompts stay consistent.

### Index and search (`tools/docindex.py`)
- Builds `Build/DocIndex/index.json` from Markdown in `docs/apple`.
- Indexes front matter, headings, and key sections.
- Search matches headings/key sections and returns anchored paths.

### Sync docs cache (`scripts/sync_docs.sh`)
- `docs/apple` is a cache-only directory and is `.gitignore`’d.
- Use the sync script to mirror a canonical docs folder into the repo cache:
  - Pull: `DOCS_SOURCE=~/docs/apple scripts/sync_docs.sh pull --allow-delete`
  - Push: `DOCS_SOURCE=~/docs/apple scripts/sync_docs.sh push`

## Notes
- This toolchain assumes a local Apple docset; it does not download docsets.
- Docsets come from Dash and Kapeli’s feeds:
  - Dash app + docsets: https://kapeli.com/dash
  - Docset feeds (download without the app): https://github.com/Kapeli/feeds
- The scripts are intentionally CLI-first so they can be scripted by agents.
- See `AGENTS_RULES.md` for the workflow guardrails we use internally.

## Status
Implemented now:
- Docset export (`tools/docset_query.py`): `export`, `fetch`, and `init`.
- Sanitizer (`tools/docset_sanitize.py`): front matter rebuild + TOC trimming.
- Index + search (`tools/docindex.py`): JSON index + heading/key-section search.
- Metadata peek (`tools/docmeta.py`): front matter/TOC inspection.
- Cache sync (`scripts/sync_docs.sh`): pull/push to a canonical docs folder.

Planned (not implemented):
- Automated docset download/updates from Kapeli feeds or other vendor sources.

## Docsets: how it works today
- A “docset” here means the Dash-compatible docset format on disk.
- Dash is the most common way to install and 

... (truncated)

## Links

- [GitHub Repository](https://github.com/PaulSolt/DocSetQuery)
- [Original Tweet](https://x.com/PaulSolt/status/2012010080414081188)

## Original Tweet

> 👋 If you’re new to Codex, here are 7 beginner tips: 

1. Start with:

GPT-5.2-Codex high

That is high reasoning. It is enough. Don’t be tempted with xhigh unless working on something really tricky. It uses more tokens and will be slower to finish.

2. Sometimes more reasoning may not help. You may need to give your agents better docs that are up to date. I prefer to have my agents create Markdown docs from DocSet that are local, instead of web scraping.

I use DocSetQuery to create docs from Dash DocSet bundles. https://t.co/WzwVVXKvrv

3. Read @steipete post to get started.

Bookmark his blog and follow him. Read his post, it’s gold, and so are his other workflow posts.

https://t.co/uElhPUq7wv

4. Copy aspects from Peter’s agents .md file and make it your own. There’s thousands of hours of learnings in his open source projects.

https://t.co/j4vPqVbZuQ

Use the scripts too, things like committer for atomic commits are super powerful when multiple agents work in one folder.

5. Just talk to codex. You don't need complex rules. You don't need to create huge Plan .md  files. 

You can get really good results by just working on one aspect of a feature at a time, handing it off, and then letting Codex do it. 

If you get bored waiting start up another project while you wait. Ask it to do something and then go back to the original one. Most likely it will be done unless you're doing a huge refactor. 

6. You can always ask your agent to copy something from another project. Peter does this all the time and has agents leveraging work they’ve already done for new projects.

I ask my agents to create Makefiles to build and run my apps. For new projects I have them copy the structure. See my workflow video: How I use Codex GPT 5.2 with Xcode (My Complete Workflow)
https://t.co/n8wrm9jmOm

7. Ask it to do things … and most likely you’re going to need YOLO (danger mode) to get anything done without constant nagging.

Enjoy your next app!

— @PaulSolt (Paul Solt)