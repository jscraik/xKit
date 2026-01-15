# xKit Architecture

This document describes the architecture and design patterns used in xKit.

## Overview

xKit is a TypeScript-based CLI tool and library for interacting with Twitter/X's GraphQL API and archiving bookmarks to markdown. It follows a modular architecture with clear separation of concerns.

## Core Principles

1. **Modularity** - Features are organized into self-contained modules
2. **Type Safety** - Full TypeScript with strict mode
3. **Composability** - Mixin pattern for client composition
4. **Stateless** - Cookie-based auth, no session management
5. **Deterministic** - Reproducible markdown output
6. **Incremental** - State management for resumable operations

## Project Structure

```
xKit/
├── src/
│   ├── cli.ts                    # CLI entrypoint (binary)
│   ├── index.ts                  # Library entrypoint (npm package)
│   │
│   ├── cli/                      # CLI framework
│   │   ├── program.ts            # Commander setup
│   │   └── shared.ts             # Shared CLI utilities
│   │
│   ├── commands/                 # Command implementations
│   │   ├── bookmarks.ts          # Bookmark fetching
│   │   ├── bookmarks-archive.ts  # Unified archive command
│   │   ├── daemon.ts             # Daemon mode commands
│   │   ├── setup.ts              # Setup wizard
│   │   └── ...                   # Other commands
│   │
│   ├── lib/                      # Core Twitter client
│   │   ├── twitter-client.ts     # Main client (composed)
│   │   ├── twitter-client-base.ts           # Base with auth
│   │   ├── twitter-client-bookmarks.ts      # Bookmark mixin
│   │   ├── twitter-client-search.ts         # Search mixin
│   │   ├── twitter-client-posting.ts        # Posting mixin
│   │   ├── twitter-client-types.ts          # Shared types
│   │   ├── cookies.ts            # Cookie resolution
│   │   ├── query-ids.json        # GraphQL query IDs
│   │   └── features.json         # GraphQL features
│   │
│   ├── bookmark-enrichment/      # Content extraction
│   │   ├── index.ts              # Public exports
│   │   ├── types.ts              # Type definitions
│   │   ├── enricher.ts           # Main orchestrator
│   │   ├── url-expander.ts       # URL expansion
│   │   ├── content-extractor.ts  # Content extraction
│   │   └── adapters.ts           # Format adapters
│   │
│   ├── bookmark-categorization/  # Smart categorization
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── categorizer.ts
│   │
│   ├── bookmark-markdown/        # Markdown generation
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── writer.ts
│   │   └── templates.ts
│   │
│   ├── bookmark-folders/         # Folder management
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── folder-manager.ts
│   │
│   ├── bookmark-media/           # Media handling
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── media-handler.ts
│   │
│   ├── bookmark-state/           # State management
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── state-manager.ts
│   │
│   ├── bookmark-stats/           # Statistics tracking
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── stats-tracker.ts
│   │
│   ├── bookmark-daemon/          # Daemon mode
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── daemon.ts
│   │
│   ├── webhook-notifications/    # Webhook support
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── webhook-notifier.ts
│   │
│   ├── setup-wizard/             # Interactive setup
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── wizard.ts
│   │
│   ├── bookmark-export/          # Export functionality
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── bookmark-exporter.ts
│   │   ├── xapi-client.ts
│   │   ├── export-state.ts
│   │   ├── rate-limiter.ts
│   │   ├── progress-reporter.ts
│   │   ├── schema-validator.ts
│   │   └── schemas/
│   │       └── export-schema.json
│   │
│   └── bookmark-analysis/        # Analysis functionality
│       ├── index.ts
│       ├── types.ts
│       ├── analysis-engine.ts
│       ├── llm-categorizer.ts
│       ├── usefulness-scorer.ts
│       ├── script-runner.ts
│       ├── schema-validator.ts
│       └── schemas/
│           └── analysis-schema.json
│
├── tests/                        # Test files (mirrors src)
│   ├── bookmark-enrichment/
│   ├── bookmark-categorization/
│   ├── bookmark-export/
│   ├── bookmark-analysis/
│   ├── live/
│   └── *.test.ts
│
├── docs/                         # Documentation
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── bookmark-archiving.md
│   ├── releases.md
│   ├── testing.md
│   └── implementation/
│
├── examples/                     # Usage examples
│   ├── domain-analysis.js
│   └── sentiment-analysis.py
│
└── scripts/                      # Build scripts
    ├── copy-dist-assets.js
    └── update-query-ids.ts
```

## Design Patterns

### 1. Mixin Pattern (TwitterClient)

The TwitterClient uses TypeScript mixins for composition:

```typescript
// Base class with auth and request handling
class TwitterClientBase {
  protected cookies: TwitterCookies;
  protected fetchWithTimeout(url: string, options: RequestInit): Promise<Response>;
  protected getQueryId(operation: string): Promise<string>;
}

// Feature mixins
function withBookmarks<TBase>(Base: TBase) {
  return class extends Base {
    async getBookmarks(count: number): Promise<BookmarkResult>;
    async unbookmark(tweetId: string): Promise<MutationResult>;
  };
}

function withSearch<TBase>(Base: TBase) {
  return class extends Base {
    async search(query: string, count: number): Promise<SearchResult>;
  };
}

// Composed client
class TwitterClient extends 
  withBookmarks(
    withSearch(
      withPosting(
        TwitterClientBase
      )
    )
  ) {}
```

**Benefits:**

- Clean separation of features
- Easy to add new features
- Type-safe composition
- No diamond problem

### 2. Command Pattern (CLI)

Each CLI command is a separate module:

```typescript
// src/commands/bookmarks.ts
export function registerBookmarksCommand(program: Command, ctx: CliContext): void {
  program
    .command('bookmarks')
    .description('Get your bookmarked tweets')
    .option('-n, --count <number>', 'Number of bookmarks')
    .action(async (options) => {
      // Command implementation
    });
}

// src/cli/program.ts
export function createProgram(ctx: CliContext): Command {
  const program = new Command();
  
  registerBookmarksCommand(program, ctx);
  registerSearchCommand(program, ctx);
  // ... other commands
  
  return program;
}
```

**Benefits:**

- One file per command
- Easy to add new commands
- Shared context via CliContext
- Testable in isolation

### 3. Module Pattern (Features)

Each feature module follows a consistent structure:

```typescript
// src/bookmark-enrichment/index.ts
export { BookmarkEnricher } from './enricher.js';
export { UrlExpander } from './url-expander.js';
export { ContentExtractor } from './content-extractor.js';
export type { EnrichedBookmark, EnrichmentConfig } from './types.js';

// src/bookmark-enrichment/types.ts
export interface EnrichedBookmark extends BookmarkRecord {
  expandedUrls?: ExpandedUrl[];
  linkedContent?: LinkedContent[];
}

// src/bookmark-enrichment/enricher.ts
export class BookmarkEnricher {
  constructor(config: EnrichmentConfig) {}
  async enrich(bookmark: BookmarkRecord): Promise<EnrichedBookmark> {}
}
```

**Benefits:**

- Clear public API via index.ts
- Internal implementation hidden
- Consistent structure across modules
- Easy to understand and navigate

### 4. Pipeline Pattern (Archive)

The archive command uses a pipeline approach:

```typescript
async function archiveBookmarks(options: ArchiveOptions) {
  // 1. Fetch
  const tweets = await client.getBookmarks();
  
  // 2. Convert
  const bookmarks = tweetDataBatchToBookmarkRecords(tweets);
  
  // 3. Filter
  const newBookmarks = stateManager.filterNew(bookmarks);
  
  // 4. Enrich
  const enriched = await enricher.enrichBatch(newBookmarks);
  
  // 5. Categorize
  const categorized = categorizer.categorizeBatch(enriched);
  
  // 6. Write
  await writer.write(categorized);
  
  // 7. Update state
  stateManager.markBatchProcessed(categorized.map(b => b.id));
}
```

**Benefits:**

- Clear data flow
- Easy to add/remove steps
- Each step is testable
- Progress tracking at each stage

## Data Flow

### Bookmark Archiving Flow

```
Twitter API
    ↓
TweetData[] (raw API response)
    ↓
BookmarkRecord[] (normalized format)
    ↓
EnrichedBookmark[] (with URLs expanded, content extracted)
    ↓
CategorizedBookmark[] (with categories assigned)
    ↓
Markdown Files (knowledge base + archive)
```

### Type Transformations

```typescript
// 1. Raw API response
interface GraphqlTweetResult {
  rest_id?: string;
  legacy?: { full_text?: string; /* ... */ };
}

// 2. Normalized tweet
interface TweetData {
  id: string;
  text: string;
  author: { username: string; name: string };
}

// 3. Bookmark record
interface BookmarkRecord {
  id: string;
  url: string;
  text: string;
  authorUsername: string;
  authorName: string;
}

// 4. Enriched bookmark
interface EnrichedBookmark extends BookmarkRecord {
  expandedUrls?: ExpandedUrl[];
  linkedContent?: LinkedContent[];
}

// 5. Categorized bookmark
interface CategorizedBookmark extends EnrichedBookmark {
  category: string;
  categoryAction: 'file' | 'capture' | 'transcribe';
  categoryFolder: string;
}
```

## State Management

### Incremental Processing

```typescript
// .xkit/state/bookmarks-state.json
{
  "lastExportTimestamp": "2026-01-15T10:00:00Z",
  "lastBookmarkId": "1234567890",
  "processedBookmarkIds": ["123...", "456...", "789..."],
  "totalProcessed": 150
}

// Usage
const stateManager = new StateManager();
const newBookmarks = stateManager.filterNew(allBookmarks);
// Process only new bookmarks
stateManager.markBatchProcessed(newBookmarks.map(b => b.id));
stateManager.save();
```

### Daemon State

```typescript
// .xkit/daemon-state.json
{
  "running": true,
  "pid": 12345,
  "startedAt": "2026-01-15T10:00:00Z",
  "config": {
    "interval": 1800000,
    "command": "xkit archive"
  }
}
```

## Configuration Hierarchy

```
CLI Flags (highest priority)
    ↓
Environment Variables
    ↓
Project Config (.xkitrc.json5)
    ↓
Global Config (~/.config/xkit/config.json5)
    ↓
Defaults (lowest priority)
```

## Error Handling

### Error Taxonomy

```typescript
type ErrorCategory = 
  | 'validation'    // Invalid input
  | 'auth'          // Authentication failed
  | 'rate_limit'    // Rate limit exceeded
  | 'dependency'    // External service failed
  | 'timeout'       // Request timeout
  | 'unknown';      // Unexpected error
```

### Error Flow

```typescript
try {
  await operation();
} catch (error) {
  // 1. Categorize
  const category = categorizeError(error);
  
  // 2. Log
  logger.error('Operation failed', { category, error });
  
  // 3. Notify (if webhook configured)
  await webhook?.notifyError(error.message);
  
  // 4. User-facing message
  console.error(`${ctx.p('err')}${getUserMessage(category, error)}`);
  
  // 5. Exit with appropriate code
  process.exit(getExitCode(category));
}
```

## Testing Strategy

### Test Organization

```
tests/
├── unit/                    # Unit tests
│   ├── enricher.test.ts
│   └── categorizer.test.ts
├── property/                # Property-based tests
│   ├── enricher.property.test.ts
│   └── state-manager.property.test.ts
├── integration/             # Integration tests
│   ├── archive-integration.test.ts
│   └── export-integration.test.ts
└── live/                    # Live API tests
    └── live.test.ts
```

### Test Patterns

```typescript
// Unit test
describe('BookmarkEnricher', () => {
  it('should expand t.co URLs', async () => {
    const enricher = new BookmarkEnricher();
    const result = await enricher.enrich(mockBookmark);
    expect(result.expandedUrls).toBeDefined();
  });
});

// Property-based test
describe('StateManager', () => {
  it('should never lose processed IDs', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (ids) => {
        const manager = new StateManager();
        manager.markBatchProcessed(ids);
        return ids.every(id => manager.isProcessed(id));
      })
    );
  });
});

// Integration test
describe('Archive Integration', () => {
  it('should complete full archive workflow', async () => {
    const result = await archiveBookmarks(mockOptions);
    expect(result.knowledgeFiles.length).toBeGreaterThan(0);
  });
});
```

## Performance Considerations

### Batch Processing

```typescript
// Process in batches to avoid overwhelming the network
await enricher.enrichBatch(bookmarks, {
  concurrency: 5,  // 5 concurrent requests
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total}`);
  }
});
```

### Caching

```typescript
// Query ID caching
const cache = {
  path: '~/.config/xkit/query-ids-cache.json',
  ttl: 24 * 60 * 60 * 1000,  // 24 hours
};

// Auto-refresh on 404
if (response.status === 404) {
  await refreshQueryIds();
  // Retry with fresh IDs
}
```

### State Persistence

```typescript
// Save state periodically during long operations
for (const batch of batches) {
  await processBatch(batch);
  stateManager.save();  // Checkpoint
}
```

## Security

### Credential Handling

- Cookies never logged or exposed in errors
- Config files with credentials are gitignored
- Browser cookie extraction uses OS-level security
- No credentials stored in state files

### Input Validation

- All user input validated before use
- Tweet IDs validated as numeric strings
- URLs validated before fetching
- File paths sanitized

## Future Considerations

### Extensibility Points

1. **Custom Categorizers** - Plugin system for categorization rules
2. **Custom Templates** - User-defined markdown templates
3. **Custom Extractors** - Additional content extractors
4. **Custom Webhooks** - Webhook template system
5. **LLM Integration** - Optional LLM-powered analysis

### Scalability

- Worker threads for parallel processing
- Streaming for large exports
- Database backend for state (vs JSON files)
- Distributed archiving across multiple accounts

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Commander.js](https://github.com/tj/commander.js)
- [Vitest](https://vitest.dev/)
- [fast-check](https://fast-check.dev/)
