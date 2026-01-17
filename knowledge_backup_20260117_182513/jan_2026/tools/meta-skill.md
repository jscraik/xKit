---
title: "meta_skill"
type: "tool"
date_added: "Fri Jan 16 13:19:07 +0000 2026"
source: "https://github.com/Dicklesworthstone/meta_skill/tree/main/skills/building-glamorous-tuis"
tags: ["Rust"]
via: "Twitter bookmark from @doodlestein"
author: "Dicklesworthstone"
url: "https://github.com/Dicklesworthstone/meta_skill/tree/main/skills/building-glamorous-tuis"
---

# meta_skill

Rust CLI for managing Claude Code skills: indexing, building, bundling, and sharing. Integrates with CASS for mining coding session history into reusable skills.

## Metadata

- **Stars:** 75
- **Language:** Rust

## README

# ms

<div align="center">
  <img src="ms_illustration.webp" alt="ms - Meta Skill CLI: A local-first skill management platform">
</div>

<div align="center">

[![CI](https://github.com/Dicklesworthstone/meta_skill/actions/workflows/ci.yml/badge.svg)](https://github.com/Dicklesworthstone/meta_skill/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

**Meta Skill (`ms`)** is a local-first skill management platform that turns operational knowledge into structured, searchable, reusable artifacts. It provides dual persistence (SQLite + Git), hybrid search (lexical + semantic), adaptive suggestions with bandit optimization, multi-layer security (prompt injection defense + command safety gates), dependency graph analysis, provenance tracking, and native AI agent integration via MCP.

<div align="center">
<h3>Quick Install</h3>

```bash
cargo install --path .
```

**Or run without installing:**

```bash
cargo run -- <COMMAND>
```

<p><em>Works on Linux, macOS, and Windows. Requires Rust 1.85+ (Edition 2024).</em></p>
</div>

---

## What ms Actually Is

ms is not just a tool for extracting skills from AI sessions. It's a **complete skill management platform** with these core capabilities:

| Capability | What It Provides |
|-----------|------------------|
| **Skill Storage** | Dual persistence with SQLite for queries and Git for audit trails |
| **Semantic Search** | Hybrid BM25 + hash embeddings fused with Reciprocal Rank Fusion |
| **Adaptive Suggestions** | UCB bandit algorithm that learns from feedback to optimize recommendations |
| **Security** | ACIP prompt injection defense + DCG destructive command safety gates |
| **Graph Analysis** | Dependency insights via bv: cycles, bottlenecks, PageRank, execution plans |
| **Provenance** | Evidence tracking linking skills back to source sessions |
| **Multi-Machine Sync** | Git-based synchronization with conflict resolution strategies |
| **Bundle Distribution** | Portable skill packages with checksums and safe updates |
| **Effectiveness Loop** | Feedback, outcomes, experiments, and quality scoring as first-class data |
| **AI Agent Integration** | MCP server exposing skills as native tools for Claude, Codex, and others |
| **Anti-Pattern Mining** | Automatic detection of failure patterns from session history |
| **Token Packing** | Constrained optimization to fit skills within context budgets |
| **CASS Memory** | Integration with cm for playbook rules and historical context |

Skills can come from anywhere: hand-written `SKILL.md` files, mined from CASS sessions, imported from bundles, or generated through guided workflows. The CASS integration is one input method, not the defining feature.

---

## Quick Example

```bash
# Initialize a local ms root (.ms/)
ms init

# Configure skill paths
ms config skill_paths.project '["./skills"]'

# Index SKILL.md files
ms index

# Search and inspect
ms search "error handling"
ms show rust-error-handling

# Get context-aware suggestions
ms suggest

# Analyze skill dependencies
ms graph insights

# Start MCP server for AI agent integration
ms mcp serve
```

---

## Why This Architecture

### Dual Persistence: Speed + Accountability

Every skill is stored twice:

- **SQLite** for fast queries, filtering, full-text search, and metadata operations
- **Git archive** for immutable history, diffs, and audit trails

This mirrors how production systems balance operational speed with accountability. SQLite handles the "what do I need right now?" questions in milliseconds. Git answers "what happened and why?" when you need provenance.

The split also enables resilience: if the database corrupts, skills can be rebuilt from Git. If Git history is unavailable, the database still serves queries. Neither persistence layer is privileged—they serve different needs equally well.

### Hash Embeddings: Semantic Search Without Dependencies

Semantic search matters because keywords fail on phrasing differences. "Error handling" and "exception management" should match. But external embedding models create dependencies, latency, and reproducibility problems.

ms uses **deterministic hash embeddings**: FNV-1a based, 384 dimensions, computed locally. The same text produces the same vector on any machine, any time, with no model downloads or API calls. Combined with BM25 lexical search and RRF fusion, this gives both precision (exact matches) and recall (conceptual matches) without external dependencies.

Why RRF (Reciprocal Rank Fusion)? Because merging by raw scores is unstable—BM25 scores and embedding similarities have different scales and distributions. RRF uses rank positions instead, which normalizes the signals and produces stable, predictable rankings regardless of query type.

### Bandit Optimization: Learning What Works

Static ranking systems can't adapt. The suggestion engine uses a **Thompson sampling bandit** that learns from feedback:

- Each signa

... (truncated)

## Links

- [GitHub Repository](https://github.com/Dicklesworthstone/meta_skill/tree/main/skills/building-glamorous-tuis)
- [Original Tweet](https://x.com/doodlestein/status/2012152638536859826)

## Original Tweet

> I decided to turn this post into an elaborate skill that operationalizes the concept of “use any and all Charm libraries that are relevant to your use case”:

https://t.co/KimJzjKvAa

This stuff is what makes bv look so nice. And the acfs scripts. Everything Charm makes is great.

— @doodlestein (Jeffrey Emanuel)