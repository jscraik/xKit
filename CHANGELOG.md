# Changelog

## Unreleased

### Added

- **LLM Integration** - Multi-provider LLM support for bookmark analysis
  - OpenAI API integration (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
  - Anthropic Claude API integration (Opus, Sonnet, Haiku)
  - Ollama local LLM support (Qwen, Llama, Mistral models)
  - Unified LLM client interface with token tracking
  - Model Router with cost-optimization strategies (fast, balanced, quality, optimized)
  - Automatic fallback and retry logic

- **Bookmark Analysis** - Advanced bookmark analysis with LLM
  - `xkit analyze-bookmarks` command for analyzing exported bookmarks
  - LLM-powered categorization by topic
  - Usefulness scoring (heuristic, LLM, or hybrid methods)
  - Custom analysis script support
  - Analysis output with categories and scores

- **Semantic Search** - Vector embeddings for similar bookmarks
  - Ollama-based embedding generation (nomic-embed-text, mxbai-embed-large, etc.)
  - In-memory vector store with similarity search
  - `--embed` flag to generate embeddings
  - `--similar <id>` flag to find similar bookmarks

- **Bookmark Export** - X API-based bookmark export
  - `xkit export-bookmarks` command for JSON export
  - Resumable exports with state management
  - Rate limiting and retry logic
  - X API v2 authentication

- **Documentation** - Comprehensive new documentation
  - [LLM Integration Guide](docs/llm-integration.md) - Complete LLM setup and usage
  - [API Reference](docs/api-reference.md) - Full library API documentation
  - [Configuration Reference](docs/configuration.md) - Unified config documentation
  - [Contributing Guide](CONTRIBUTING.md) - Developer onboarding and workflow
  - [Examples](examples/) - Practical usage examples and custom scripts

- **Bookmark Archiving System** - Comprehensive bookmark archiving inspired by Smaug
  - `xkit archive` command for unified bookmark archiving workflow
  - `xkit setup` interactive configuration wizard
  - Automatic URL expansion and t.co link resolution
  - Content extraction from linked pages (GitHub repos, articles, videos)
  - Smart categorization system with customizable rules
  - Markdown output with frontmatter and rich metadata
  - Knowledge base organization (tools/, articles/, videos/, podcasts/)
  - Incremental processing with state management
  - GitHub repository metadata extraction (README, stars, language, topics)
  - Article metadata extraction (title, author, reading time, excerpt)
  - Video metadata extraction (title, duration, description)
  - Date-based grouping in archive file
  - Duplicate detection and filtering
  - Force re-processing option
  - Custom output directories and timezone support
  - Library exports for programmatic usage

- **Webhook Notifications** - Real-time notifications for archive operations
  - Discord webhook support with rich embeds
  - Slack webhook support with attachments
  - Generic webhook support for custom integrations
  - Event types: start, success, error, rate_limit
  - Color-coded messages with detailed statistics
  - Configurable notification preferences

- **Folder Support** - Twitter bookmark folder integration
  - Map bookmark folder IDs to tag names
  - Preserve folder organization as tags
  - Fetch from specific folders with `--folder-id`
  - Automatic folder tag addition
  - Support for multiple folder configurations

- **Media Attachment Support** - Extract and display tweet media
  - Extract photos, videos, and GIFs from tweets
  - Media metadata (type, URL, dimensions, duration)
  - Format media for markdown output
  - Media summary generation
  - Configurable media inclusion with `--include-media`

- **Progress & Stats Reporting** - Detailed processing insights
  - Real-time progress tracking with progress bars
  - Processing time breakdown (enrichment, categorization, writing)
  - Archive growth statistics (daily/weekly/monthly)
  - Detailed performance metrics
  - Error tracking and reporting
  - Display with `--stats` flag

- **Daemon/Watch Mode** - Continuous background archiving
  - `xkit daemon start` - Start continuous archiving
  - `xkit daemon stop` - Stop the daemon
  - `xkit daemon status` - Show daemon status
  - Configurable intervals (30s, 5m, 1h, etc.)
  - Run on start option with `--run-now`
  - Automatic retry with exponential backoff
  - Graceful shutdown handling
  - Event system for monitoring

### Changed

- Enhanced bookmark commands to support new archiving features
- Updated package description and keywords
- Added comprehensive documentation in `docs/bookmark-archiving.md`
- Archive command now supports 13 options for full customization
- Library exports expanded to include all new modules

## 0.7.0

### Minor Changes

- aea2666: Rebrand from bird to xKit

  - Changed package name from @steipete/bird to @brainwav/xkit
  - Updated CLI command from `bird` to `xkit`
  - Updated all environment variables from BIRD*\*to XKIT*\*
  - Updated configuration paths from ~/.config/bird/ to ~/.config/xkit/
  - Changed repository owner from steipete to jscraik
  - Added xKit branding and logo
  - Set up automated release pipeline with changesets

## 0.6.0 — 2026-01-05

### Added

- Bookmark exports now support pagination (`--all`, `--max-pages`) with retries (#15) — thanks @Nano1337.
- `lists` + `list-timeline` commands for Twitter Lists (#21) — thanks @harperreed
- Tweet JSON output now includes media items (photos, videos, GIFs) (#14) — thanks @Hormold
- Bookmarks can resume pagination from a cursor (#26) — thanks @leonho
- `unbookmark` command to remove bookmarked tweets (#22) — thanks @mbelinky.

### Changed

- Feature flags can be overridden at runtime via `features.json` (refreshable via `query-ids`).

## 0.5.1 — 2026-01-01

### Changed

- `xkit --help` now includes explicit "Shortcuts" and "JSON Output" sections (documents `xkit <tweet-id-or-url>` shorthand + `--json`).
- Release docs now include explicit npm publish verification steps.

### Fixed

- `pnpm xkit --help` now works (dev script runs the CLI entrypoint, not the library entrypoint).
- `following`/`followers` now fall back to internal v1.1 REST endpoints when GraphQL returns `404`.

### Tests

- Add root help output regression test.
- Add opt-in live CLI test suite (real GraphQL calls; skipped by default; gated via `XKIT_LIVE=1`).

## 0.5.0 — 2026-01-01

### Added

- `likes` command to list your liked tweets (thanks @swairshah).
- Quoted tweet data in JSON output + `--quote-depth` (thanks @alexknowshtml).
- `following`/`followers` commands to list users (thanks @lockmeister).

### Changed

- Query ID updater now tracks the Likes GraphQL operation.
- Query ID updater now tracks Following/Followers GraphQL operations.
- Query ID updater now tracks BookmarkFolderTimeline and keeps bookmark query IDs seeded.
- `following`/`followers` JSON user fields are now camelCase (`followersCount`, `followingCount`, `isBlueVerified`, `profileImageUrl`, `createdAt`).
- Cookie extraction timeout is now configurable (default 30s on macOS) via `--cookie-timeout` / `XKIT_COOKIE_TIMEOUT_MS` (thanks @tylerseymour).
- Search now paginates beyond 20 results when using `-n` (thanks @ryanh-ai).
- Library exports are now separated from the CLI entrypoint for easier embedding.

## 0.4.1 — 2025-12-31

### Added

- `bookmarks` command to list your bookmarked tweets.
- `bookmarks --folder-id` to fetch bookmark folders (thanks @tylerseymour).

### Changed

- Cookie extraction now uses `@steipete/sweet-cookie` (drops `sqlite3` CLI + custom browser readers in xkit).
- Query ID updater now tracks the Bookmarks GraphQL operation.
- Lint rules stricter (block statements, no-negation-else, useConst/useTemplate, top-level regex, import extension enforcement).
- `pnpm lint` now runs both Biome and oxlint (type-aware).

### Tests

- Coverage thresholds raised to 90% statements/lines/functions (80% branches).
- Added targeted Twitter client coverage suites.

## 0.4.0 — 2025-12-26

### Added

- Cookie source selection: `--cookie-source safari|chrome|firefox` (repeatable) + `cookieSource` config (string or array).

### Fixed

- `tweet`/`reply`: fallback to `statuses/update.json` when GraphQL `CreateTweet` returns error 226 (“automated request”).

### Breaking

- Remove `allowSafari`/`allowChrome`/`allowFirefox` config toggles in favor of `cookieSource` ordering.

## 0.3.0 — 2025-12-26

### Added

- Safari cookie extraction (`Cookies.binarycookies`) + `allowSafari` config toggle.

### Changed

- Removed the Sweetistics engine + fallback. `bird` is GraphQL-only.
- Browser cookie fallback order: Safari → Chrome → Firefox.

### Tests

- Enforce coverage thresholds (>= 70% statements/branches/functions/lines) + expand unit coverage for version/output/Twitter client branches.

## 0.2.0 — 2025-12-26

### Added

- Output controls: `--plain`, `--no-emoji`, `--no-color` (respects `NO_COLOR`).
- `help` command: `bird help <command>`.
- Runtime GraphQL query ID refresh: `bird query-ids --fresh` (cached on disk; auto-retry on 404; override cache via `BIRD_QUERY_IDS_CACHE`).
- GraphQL media uploads via `--media` (up to 4 images/GIFs, or 1 video).

### Fixed

- CLI `--version`: read version from `package.json`/`VERSION` (no hardcoded string) + append git sha when available.

### Changed

- `mentions`: no hardcoded user; defaults to authenticated user or accepts `--user @handle`.
- GraphQL query ID updater: correctly pairs `operationName` ↔ `queryId` (CreateTweet/CreateRetweet/etc).
- `build:dist`: copies `src/lib/query-ids.json` into `dist/lib/query-ids.json` (keeps `dist/` in sync).
- `--engine graphql`: strict GraphQL-only (disables Sweetistics fallback).

## 0.1.1 — 2025-12-26

### Changed

- Engine default now `auto` (GraphQL primary; Sweetistics only on fallback when configured).

### Tests

- Add engine resolution tests for auto/default behavior.

### Fixed

- GraphQL read: rotate TweetDetail query IDs with fallback to avoid 404s.

## 0.1.0 — 2025-12-20

### Added

- CLI commands: `tweet`, `reply`, `read`, `replies`, `thread`, `search`, `mentions`, `whoami`, `check`.
- URL/ID shorthand for `read`, plus `--json` output where supported.
- GraphQL engine with cookie auth from Firefox/Chrome/env/flags (macOS browsers).
- Sweetistics engine (API key) with automatic fallback when configured.
- Media uploads via Sweetistics with per-item alt text (images or single video).
- Long-form Notes and Articles extraction for full text output.
- Thread + reply fetching with full conversation parsing.
- Search + mentions via GraphQL (latest timeline).
- JSON5 config files (`~/.config/bird/config.json5`, `./.birdrc.json5`) with engine defaults, profiles, allowChrome/allowFirefox, and timeoutMs.
- Request timeouts (`--timeout`, `timeoutMs`) for GraphQL and Sweetistics calls.
- Bun-compiled standalone binary via `pnpm run build`.
- Query ID refresh helper: `pnpm run graphql:update`.
