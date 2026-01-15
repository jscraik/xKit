# Design Document: Bookmark Export and Analysis

## Overview

The bookmark export and analysis system consists of two main components that work in sequence:

1. **Bookmark Exporter**: A CLI tool that authenticates with X (Twitter) API, retrieves all user bookmarks with pagination and rate limit handling, and exports them to a structured JSON file.

2. **Analysis Engine**: A processing pipeline that reads exported bookmark JSON, enriches it with categorization and usefulness scores using LLM or custom scripts, and outputs an enhanced JSON file.

The design emphasizes separation of concerns: export is independent of analysis, allowing users to export once and run multiple analysis passes with different configurations.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     User Interface (CLI)                     │
└─────────────────┬───────────────────────────┬───────────────┘
                  │                           │
                  ▼                           ▼
    ┌─────────────────────────┐   ┌─────────────────────────┐
    │   Bookmark Exporter     │   │   Analysis Engine       │
    │                         │   │                         │
    │  ┌──────────────────┐   │   │  ┌──────────────────┐  │
    │  │ X API Client     │   │   │  │ LLM Categorizer  │  │
    │  └──────────────────┘   │   │  └──────────────────┘  │
    │  ┌──────────────────┐   │   │  ┌──────────────────┐  │
    │  │ Rate Limiter     │   │   │  │ Usefulness Scorer│  │
    │  └──────────────────┘   │   │  └──────────────────┘  │
    │  ┌──────────────────┐   │   │  ┌──────────────────┐  │
    │  │ JSON Serializer  │   │   │  │ Script Runner    │  │
    │  └──────────────────┘   │   │  └──────────────────┘  │
    └─────────────┬───────────┘   └───────────┬─────────────┘
                  │                           │
                  ▼                           ▼
         bookmarks_export.json      bookmarks_analyzed.json
```

### Component Responsibilities

**Bookmark Exporter**:

- Authenticate with X API using OAuth or API tokens
- Retrieve bookmarks with pagination support
- Handle rate limiting with exponential backoff
- Extract and structure bookmark metadata
- Serialize to JSON with schema validation
- Provide progress feedback during export

**Analysis Engine**:

- Parse and validate exported JSON
- Route bookmarks to configured analyzers (LLM, scripts)
- Categorize content using LLM prompts
- Score usefulness based on configurable criteria
- Execute custom analysis scripts
- Merge analysis results back into bookmark records
- Write enriched JSON output

## Components and Interfaces

### Bookmark Exporter

#### X API Client

```typescript
interface XAPIClient {
  authenticate(credentials: Credentials): Promise<AuthToken>
  getBookmarks(token: AuthToken, cursor?: string): Promise<BookmarkPage>
  getUserInfo(token: AuthToken): Promise<UserInfo>
}

interface Credentials {
  apiKey: string
  apiSecret: string
  accessToken?: string
  accessSecret?: string
}

interface BookmarkPage {
  bookmarks: RawBookmark[]
  nextCursor: string | null
  rateLimit: RateLimitInfo
}

interface RawBookmark {
  id: string
  text: string
  authorId: string
  createdAt: string
  publicMetrics: {
    likeCount: number
    retweetCount: number
    replyCount: number
  }
  entities?: {
    urls?: Array<{ expandedUrl: string }>
  }
}
```

#### Rate Limiter

```typescript
interface RateLimiter {
  checkLimit(endpoint: string): Promise<void>
  updateLimit(info: RateLimitInfo): void
  waitIfNeeded(): Promise<void>
}

interface RateLimitInfo {
  limit: number
  remaining: number
  resetAt: number
}
```

#### Bookmark Record (Export Schema)

```typescript
interface BookmarkExport {
  metadata: ExportMetadata
  bookmarks: BookmarkRecord[]
}

interface ExportMetadata {
  exportTimestamp: string
  totalCount: number
  exporterVersion: string
  userId: string
  username: string
}

interface BookmarkRecord {
  id: string
  url: string
  text: string
  authorUsername: string
  authorName: string
  createdAt: string
  likeCount: number
  retweetCount: number
  replyCount: number
}
```

### Analysis Engine

#### Analyzer Interface

```typescript
interface Analyzer {
  name: string
  analyze(bookmark: BookmarkRecord): Promise<AnalysisResult>
}

interface AnalysisResult {
  categories?: string[]
  usefulnessScore?: number
  customFields?: Record<string, any>
}
```

#### LLM Categorizer

```typescript
interface LLMCategorizer extends Analyzer {
  configure(config: LLMConfig): void
  categorize(text: string): Promise<string[]>
}

interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'custom'
  model: string
  apiKey: string
  prompt: string
  maxCategories: number
}
```

#### Usefulness Scorer

```typescript
interface UsefulnessScorer extends Analyzer {
  configure(config: ScoringConfig): void
  score(bookmark: BookmarkRecord): Promise<number>
}

interface ScoringConfig {
  method: 'llm' | 'heuristic' | 'hybrid'
  weights: {
    engagement: number
    recency: number
    contentQuality: number
  }
  llmConfig?: LLMConfig
}
```

#### Script Runner

```typescript
interface ScriptRunner extends Analyzer {
  loadScript(scriptPath: string): Promise<void>
  execute(bookmark: BookmarkRecord): Promise<Record<string, any>>
  validate(output: any): boolean
}
```

#### Analysis Output Schema

```typescript
interface AnalysisExport {
  metadata: AnalysisMetadata
  bookmarks: EnrichedBookmarkRecord[]
}

interface AnalysisMetadata extends ExportMetadata {
  analysisTimestamp: string
  categoriesApplied: string[]
  scoringMethod: string
  analyzersUsed: string[]
}

interface EnrichedBookmarkRecord extends BookmarkRecord {
  categories?: string[]
  usefulnessScore?: number
  customAnalysis?: Record<string, any>
}
```

## Data Models

### Bookmark Lifecycle

```
Raw X API Data → BookmarkRecord → EnrichedBookmarkRecord
     (fetch)         (export)          (analysis)
```

### JSON Schema Validation

The system uses JSON Schema to validate both export and analysis output:

**Export Schema** (`bookmark-export.schema.json`):

- Validates structure of exported bookmarks
- Ensures all required fields are present
- Enforces type constraints (numbers, strings, dates)

**Analysis Schema** (`bookmark-analysis.schema.json`):

- Extends export schema with analysis fields
- Validates category arrays and score ranges
- Allows custom fields with type validation

### Data Persistence

- **Export files**: `bookmarks_export_{timestamp}.json`
- **Analysis files**: `bookmarks_analyzed_{method}_{timestamp}.json`
- **State files**: `.bookmark_export_state.json` (for resumable exports)
- **Log files**: `export.log`, `analysis.log`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Export Properties

Property 1: Bookmark completeness
*For any* bookmark retrieved from the X API, the exported BookmarkRecord should contain all required fields: id, url, text, authorUsername, authorName, createdAt, likeCount, retweetCount, and replyCount
**Validates: Requirements 1.3, 3.2**

Property 2: Export serialization round-trip
*For any* set of bookmarks, serializing to JSON then deserializing should produce equivalent bookmark data
**Validates: Requirements 1.4**

Property 3: Export file creation
*For any* completed export, a JSON file should exist with a timestamp-based filename containing the serialized bookmark data
**Validates: Requirements 1.5**

Property 4: Rate limit compliance
*For any* rate limit response from the X API, the exporter should wait at least the specified reset period before making the next request
**Validates: Requirements 2.1**

Property 5: Pagination completeness
*For any* multi-page bookmark collection, the exporter should retrieve bookmarks from all available pages until no next cursor is returned
**Validates: Requirements 2.2**

Property 6: Resumable export state
*For any* interrupted export at page N, resuming the export should start from page N rather than page 1
**Validates: Requirements 2.3**

Property 7: Schema conformance
*For any* exported JSON file, it should validate successfully against the bookmark export schema
**Validates: Requirements 3.1**

Property 8: Null handling for missing fields
*For any* bookmark with unavailable optional fields, those fields should be present in the exported record with null values rather than being omitted
**Validates: Requirements 3.3**

Property 9: Export metadata presence
*For any* export file, the metadata section should contain exportTimestamp, totalCount, and exporterVersion fields
**Validates: Requirements 3.4**

### Analysis Properties

Property 10: JSON parsing validity
*For any* valid bookmark export JSON file, the Analysis Engine should successfully parse it without errors
**Validates: Requirements 4.1**

Property 11: Category field presence
*For any* bookmark processed with LLM categorization, the output should include a categories field containing an array of category labels
**Validates: Requirements 4.2, 4.3, 4.4**

Property 12: Usefulness score range
*For any* bookmark evaluated for usefulness, the assigned usefulnessScore should be a number between 0 and 100 inclusive
**Validates: Requirements 5.3, 5.4**

Property 13: Multiple scoring methods
*For any* bookmark, both LLM-based and script-based scoring methods should produce valid usefulness scores in the range [0, 100]
**Validates: Requirements 5.5**

Property 14: Script execution with correct input
*For any* valid custom analysis script, it should be executed with the complete exported bookmark JSON as input
**Validates: Requirements 6.2**

Property 15: Script output merging
*For any* valid script output, the custom fields should be merged into the corresponding bookmark records in the analysis output
**Validates: Requirements 6.3**

Property 16: Script output validation
*For any* script output, it should be validated against the expected schema before merging, and invalid output should be rejected
**Validates: Requirements 6.5**

Property 17: Original data preservation
*For any* bookmark in the analysis output, all original fields from the export should be preserved unchanged
**Validates: Requirements 7.2**

Property 18: Analysis output completeness
*For any* completed analysis, the output JSON file should contain analysis metadata (analysisTimestamp, categoriesApplied, scoringMethod) and follow the naming pattern indicating analysis type and timestamp
**Validates: Requirements 7.1, 7.3, 7.4**

Property 19: Error logging with context
*For any* error during export or analysis, a log entry should be created containing the error message, operation context, and relevant identifiers
**Validates: Requirements 8.1, 8.2**

Property 20: Partial results on critical failure
*For any* critical error that prevents completion, the system should write partial results to disk along with an error summary
**Validates: Requirements 8.3**

Property 21: Progress reporting
*For any* export or analysis operation processing more than 10 bookmarks, progress updates should be emitted showing the count of processed bookmarks
**Validates: Requirements 9.1, 9.2**

Property 22: Completion summary
*For any* completed operation, a summary should be displayed containing total items processed, duration, and output file location
**Validates: Requirements 2.4, 9.3**

## Error Handling

### Error Categories

**Authentication Errors**:

- Invalid credentials → Return descriptive error, halt export
- Expired tokens → Attempt refresh, fallback to re-authentication
- Network failures → Retry with exponential backoff (max 3 attempts)

**API Errors**:

- Rate limiting → Wait for reset period, resume automatically
- 404 Not Found → Log warning, continue with remaining bookmarks
- 500 Server Error → Retry with backoff, mark as failed after 3 attempts
- Invalid response format → Log error, skip bookmark, continue

**Analysis Errors**:

- LLM timeout → Mark bookmark as "uncategorized", continue
- LLM invalid response → Use fallback categorization, log warning
- Script execution failure → Log error, skip custom analysis, continue
- Script output validation failure → Reject output, log error, continue

**File System Errors**:

- Write permission denied → Halt with clear error message
- Disk full → Halt with clear error message
- File already exists → Append unique suffix (timestamp + random)

### Error Recovery

**Resumable Operations**:

- Export maintains state file (`.bookmark_export_state.json`)
- State includes: last cursor, processed count, start time
- On resume: validate state, continue from last cursor
- On completion: delete state file

**Partial Results**:

- On critical failure, write partial results with suffix `_partial`
- Include error summary in metadata section
- Log full error details to error log file

## Testing Strategy

### Unit Testing

Unit tests will focus on specific examples, edge cases, and error conditions:

**Export Component**:

- Test authentication with valid credentials (example)
- Test authentication failure handling (edge case)
- Test rate limit response handling (edge case)
- Test pagination with single page (edge case)
- Test null handling for missing optional fields (edge case)
- Test file collision handling (edge case)

**Analysis Component**:

- Test LLM categorization with sample bookmark (example)
- Test LLM failure handling (edge case)
- Test script execution with valid script (example)
- Test script failure handling (edge case)
- Test script output validation rejection (edge case)
- Test file collision handling (edge case)

**Integration Tests**:

- Test complete export flow with mocked X API
- Test complete analysis flow with mocked LLM
- Test export → analysis pipeline end-to-end

### Property-Based Testing

Property tests will verify universal properties across all inputs using a property-based testing library (fast-check for TypeScript/JavaScript, Hypothesis for Python).

**Configuration**:

- Minimum 100 iterations per property test
- Each test tagged with: `Feature: bookmark-export-analysis, Property N: [property text]`
- Use generators for: bookmarks, API responses, file contents, scripts

**Test Generators**:

- `arbitraryBookmark()`: Generate random valid bookmark records
- `arbitraryAPIResponse()`: Generate random X API responses
- `arbitraryExportJSON()`: Generate random valid export files
- `arbitraryScript()`: Generate random valid analysis scripts

**Property Test Coverage**:

- All 22 correctness properties should have corresponding property tests
- Properties 1-9: Export functionality
- Properties 10-18: Analysis functionality
- Properties 19-22: Error handling and progress reporting

**Example Property Test Structure**:

```typescript
// Feature: bookmark-export-analysis, Property 2: Export serialization round-trip
test('serialization round-trip preserves data', () => {
  fc.assert(
    fc.property(fc.array(arbitraryBookmark()), (bookmarks) => {
      const json = serialize(bookmarks);
      const deserialized = deserialize(json);
      expect(deserialized).toEqual(bookmarks);
    }),
    { numRuns: 100 }
  );
});
```

### Testing Balance

- **Unit tests**: Focus on concrete examples and edge cases (authentication failures, LLM timeouts, file collisions)
- **Property tests**: Focus on universal correctness properties (data preservation, schema conformance, completeness)
- **Integration tests**: Focus on component interactions and end-to-end flows

Both unit and property tests are necessary for comprehensive coverage. Unit tests catch specific bugs and edge cases, while property tests verify general correctness across all inputs.

## Implementation Notes

### Technology Choices

**Export Component**:

- Language: TypeScript/Node.js or Python
- X API Library: twitter-api-v2 (Node.js) or tweepy (Python)
- JSON Schema Validation: ajv (Node.js) or jsonschema (Python)
- CLI Framework: commander (Node.js) or click (Python)

**Analysis Component**:

- LLM Integration: OpenAI SDK, Anthropic SDK, or LangChain
- Script Execution: child_process (Node.js) or subprocess (Python)
- Property Testing: fast-check (Node.js) or Hypothesis (Python)

### Configuration

**Export Configuration** (`.bookmark-export.config.json`):

```json
{
  "xApi": {
    "apiKey": "...",
    "apiSecret": "...",
    "accessToken": "...",
    "accessSecret": "..."
  },
  "output": {
    "directory": "./exports",
    "filenamePattern": "bookmarks_export_{timestamp}.json"
  },
  "rateLimit": {
    "maxRetries": 3,
    "backoffMultiplier": 2
  }
}
```

**Analysis Configuration** (`.bookmark-analysis.config.json`):

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "...",
    "categorization": {
      "enabled": true,
      "prompt": "Categorize this bookmark into topics...",
      "maxCategories": 3
    }
  },
  "scoring": {
    "method": "hybrid",
    "weights": {
      "engagement": 0.3,
      "recency": 0.2,
      "contentQuality": 0.5
    }
  },
  "customScripts": [
    "./scripts/domain-analysis.js",
    "./scripts/sentiment-analysis.py"
  ],
  "output": {
    "directory": "./analysis",
    "filenamePattern": "bookmarks_analyzed_{method}_{timestamp}.json"
  }
}
```

### Performance Considerations

**Export**:

- Batch API requests where possible
- Use streaming JSON serialization for large datasets
- Implement connection pooling for API requests
- Cache user info to avoid redundant lookups

**Analysis**:

- Parallelize LLM requests with rate limiting
- Batch bookmarks for LLM categorization (multiple per request)
- Use worker threads/processes for script execution
- Stream processing for large bookmark collections

### Security Considerations

**Credentials**:

- Never log or expose API keys
- Support environment variables for sensitive config
- Validate credential format before use
- Clear credentials from memory after use

**Script Execution**:

- Sandbox custom scripts (limited file system access)
- Timeout scripts after configurable duration
- Validate script output before merging
- Log all script executions for audit trail

**Data Privacy**:

- Bookmark data may contain sensitive information
- Support local-only processing (no external services)
- Allow users to exclude specific bookmarks from analysis
- Provide data deletion utilities
