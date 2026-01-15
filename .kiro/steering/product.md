---
inclusion: always
---

# Product Overview

xKit is a fast CLI tool for interacting with X/Twitter via the undocumented GraphQL API using cookie-based authentication. It enables tweeting, replying, reading, searching, and archiving bookmarks to markdown for personal knowledge bases.

## Core Features

- Read/search tweets, threads, replies, mentions
- Post tweets and replies with media attachments
- Bookmark management and archiving to markdown
- News and trending topics from X's Explore page
- List management and timelines
- Following/followers tracking
- JSON output for scripting and automation

## Target Users

- Solo developers building scripts and automation
- Researchers and writers building personal knowledge bases
- CLI power users who prefer terminal workflows

## Key Constraints

- Uses undocumented X/Twitter GraphQL API (expect breakage without notice)
- Cookie-based authentication only (no official API keys)
- Query IDs rotate frequently and require periodic refresh
- Rate limits and anti-bot measures can impact availability
- Single-user, local-only tool (no server-side components)

## Stability Expectations

- JSON output schema is stable and versioned for scripting
- Breaking changes require major version bumps
- Query ID refresh mechanism provides self-healing for API changes
- Error messages include actionable next steps
