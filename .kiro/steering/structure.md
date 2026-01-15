---
inclusion: always
---

# Project Structure

## Root Layout

```
xKit/
├── src/                    # Source code
├── tests/                  # Test files (mirrors src structure)
├── dist/                   # Compiled output (gitignored)
├── docs/                   # Documentation site
├── scripts/                # Build and utility scripts
├── .kiro/                  # Kiro AI assistant config
├── .specs/                 # Product and technical specs
├── examples/               # Usage examples
└── brand/                  # Brand assets
```

## Source Organization

### Core CLI (`src/`)

- `cli.ts` - CLI entrypoint (binary)
- `index.ts` - Library entrypoint (npm package)
- `cli/` - CLI framework setup (Commander)
- `commands/` - Command implementations (one file per command)

### Library (`src/lib/`)

- `twitter-client.ts` - Main client export (composed via mixins)
- `twitter-client-*.ts` - Feature mixins (bookmarks, search, posting, etc.)
- `twitter-client-base.ts` - Base client with auth and request handling
- `twitter-client-types.ts` - Shared TypeScript types
- `cookies.ts` - Cookie resolution and browser extraction
- `output.ts` - Terminal output formatting
- `query-ids.json` - Baseline GraphQL query ID mappings
- `features.json` - GraphQL feature flags

### Feature Modules (`src/`)

Each feature module follows this pattern:

```
src/bookmark-{feature}/
├── index.ts              # Public exports
├── types.ts              # TypeScript types
├── {feature}.ts          # Main implementation
└── schemas/              # JSON schemas (if applicable)
    └── {feature}-schema.json
```

Feature modules:

- `bookmark-analysis/` - Bookmark analysis engine with LLM categorization
- `bookmark-export/` - Bookmark export to various formats
- `bookmark-enrichment/` - Content extraction and URL expansion
- `bookmark-categorization/` - Smart categorization logic
- `bookmark-markdown/` - Markdown generation and templates
- `bookmark-folders/` - Folder management
- `bookmark-media/` - Media handling
- `bookmark-state/` - State management for incremental processing
- `bookmark-stats/` - Statistics tracking
- `bookmark-daemon/` - Background daemon for continuous archiving
- `webhook-notifications/` - Webhook notification support
- `setup-wizard/` - Interactive setup flow

## Test Organization

Tests mirror the source structure:

```
tests/
├── bookmark-analysis/    # Tests for bookmark-analysis module
├── bookmark-export/      # Tests for bookmark-export module
├── live/                 # Live API integration tests
└── *.test.ts            # Core library tests
```

Test naming conventions:

- `{module}.test.ts` - Unit tests
- `{module}.property.test.ts` - Property-based tests
- `{module}-integration.test.ts` - Integration tests
- `live.test.ts` - Live API tests (require auth)

## Configuration Files

- `package.json` - npm package config and scripts
- `tsconfig.json` - TypeScript compiler config
- `vitest.config.ts` - Test runner config
- `biome.json` - Formatter and linter config
- `.vale.ini` - Documentation linter config
- `.markdownlint-cli2.jsonc` - Markdown linter config

## Documentation

- `README.md` - Main documentation (install, usage, API)
- `CHANGELOG.md` - Version history (managed by Changesets)
- `docs/` - Documentation site
  - `bookmark-archiving.md` - Bookmark archiving guide
  - `bookmark-export-analysis.md` - Export analysis guide
  - `releases.md` - Release process
  - `releasing.md` - Release checklist
  - `testing.md` - Testing guide

## Conventions

### File Naming

- Kebab-case for all files: `twitter-client-bookmarks.ts`
- `.test.ts` suffix for unit tests
- `.property.test.ts` suffix for property-based tests
- `.js` extensions required in imports (ESM)

### Module Exports

- Each feature module exports via `index.ts`
- Public API surface is minimal and explicit
- Internal utilities are not exported

### Code Organization

- One class/function per file when possible
- Related functionality grouped in feature modules
- Shared types in `types.ts` within each module
- Schemas in `schemas/` subdirectory

### Import Patterns

```typescript
// External dependencies first
import { Command } from 'commander';

// Internal lib imports
import { TwitterClient } from './lib/twitter-client.js';

// Feature module imports
import { archiveBookmarks } from './bookmark-export/index.js';

// Types (type-only imports)
import type { BookmarkData } from './bookmark-export/types.js';
```

### Error Handling

- Custom error classes in `errors.ts` within feature modules
- Structured error types with actionable messages
- Error taxonomy: validation | auth | rate_limit | dependency | timeout | unknown
