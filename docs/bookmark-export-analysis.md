# Bookmark Export and Analysis

A comprehensive system for exporting X (Twitter) bookmarks and performing intelligent analysis using LLM categorization, usefulness scoring, and custom scripts.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Export Command](#export-command)
- [Analysis Command](#analysis-command)
- [Configuration](#configuration)
- [Custom Scripts](#custom-scripts)
- [Examples](#examples)
- [API Reference](#api-reference)

## Overview

The bookmark export and analysis system consists of two main components:

1. **Bookmark Exporter**: Retrieves bookmarks from X API and exports them to structured JSON
2. **Analysis Engine**: Processes exported bookmarks with categorization, scoring, and custom analysis

### Features

- Export all X bookmarks with full metadata
- Handle rate limiting and pagination automatically
- Resume interrupted exports
- LLM-based categorization (OpenAI, Anthropic)
- Multiple usefulness scoring methods (LLM, heuristic, hybrid)
- Custom analysis scripts in any language
- Comprehensive error handling and logging
- Property-based testing for correctness

## Installation

```bash
npm install @brainwav/xkit
```

Or install from source:

```bash
git clone https://github.com/brainwav/xkit.git
cd xkit
npm install
npm run build
```

## Quick Start

### 1. Export Bookmarks

```bash
# Set up X API credentials
export X_API_KEY="your-api-key"
export X_API_SECRET="your-api-secret"
export X_ACCESS_TOKEN="your-access-token"
export X_ACCESS_SECRET="your-access-secret"

# Export bookmarks
xkit bookmark-export
```

This creates a file like `bookmarks_export_2024-01-15T10-30-00.json`.

### 2. Analyze Bookmarks

```bash
# Set up LLM API key (for categorization)
export LLM_API_KEY="your-openai-api-key"

# Analyze bookmarks
xkit bookmark-analysis --input bookmarks_export_2024-01-15T10-30-00.json
```

This creates a file like `bookmarks_analyzed_hybrid_2024-01-15T11-00-00.json`.

## Export Command

### Basic Usage

```bash
xkit bookmark-export [options]
```

### Options

- `--output-dir <dir>`: Output directory (default: `./exports`)
- `--resume`: Resume interrupted export from saved state
- `--config <path>`: Path to config file (default: `.bookmark-export.config.json`)

### Examples

```bash
# Export to custom directory
xkit bookmark-export --output-dir ./my-exports

# Resume interrupted export
xkit bookmark-export --resume

# Use custom config file
xkit bookmark-export --config ./custom-config.json
```

### Export Output Format

```json
{
  "metadata": {
    "exportTimestamp": "2024-01-15T10:30:00Z",
    "totalCount": 1523,
    "exporterVersion": "1.0.0",
    "userId": "123456789",
    "username": "myusername"
  },
  "bookmarks": [
    {
      "id": "1234567890",
      "url": "https://example.com/article",
      "text": "Great article about TypeScript!",
      "authorUsername": "author",
      "authorName": "Author Name",
      "createdAt": "2024-01-15T10:00:00Z",
      "likeCount": 42,
      "retweetCount": 15,
      "replyCount": 8
    }
  ]
}
```

## Analysis Command

### Basic Usage

```bash
xkit bookmark-analysis --input <export-file> [options]
```

### Options

- `--input <file>`: Input export file (required)
- `--output-dir <dir>`: Output directory (default: `./analysis`)
- `--method <method>`: Scoring method: `llm`, `heuristic`, or `hybrid` (default: `heuristic`)
- `--scripts <paths>`: Comma-separated list of custom script paths
- `--no-categorization`: Disable LLM categorization
- `--config <path>`: Path to config file (default: `.bookmark-analysis.config.json`)

### Examples

```bash
# Basic analysis with heuristic scoring
xkit bookmark-analysis --input bookmarks_export.json

# LLM-based scoring
xkit bookmark-analysis --input bookmarks_export.json --method llm

# With custom scripts
xkit bookmark-analysis --input bookmarks_export.json --scripts ./examples/domain-analysis.js,./examples/sentiment-analysis.py

# Disable categorization
xkit bookmark-analysis --input bookmarks_export.json --no-categorization
```

### Analysis Output Format

```json
{
  "metadata": {
    "exportTimestamp": "2024-01-15T10:30:00Z",
    "totalCount": 1523,
    "exporterVersion": "1.0.0",
    "userId": "123456789",
    "username": "myusername",
    "analysisTimestamp": "2024-01-15T11:00:00Z",
    "categoriesApplied": ["programming", "typescript", "javascript"],
    "scoringMethod": "hybrid",
    "analyzersUsed": ["llm-categorizer", "usefulness-scorer"]
  },
  "bookmarks": [
    {
      "id": "1234567890",
      "url": "https://example.com/article",
      "text": "Great article about TypeScript!",
      "authorUsername": "author",
      "authorName": "Author Name",
      "createdAt": "2024-01-15T10:00:00Z",
      "likeCount": 42,
      "retweetCount": 15,
      "replyCount": 8,
      "categories": ["programming", "typescript"],
      "usefulnessScore": 85
    }
  ]
}
```

## Configuration

### Export Configuration

Create `.bookmark-export.config.json`:

```json
{
  "xApi": {
    "apiKey": "your-api-key",
    "apiSecret": "your-api-secret",
    "accessToken": "your-access-token",
    "accessSecret": "your-access-secret"
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

### Analysis Configuration

Create `.bookmark-analysis.config.json`:

```json
{
  "llm": {
    "provider": "openai",
    "model": "gpt-4",
    "apiKey": "your-openai-api-key",
    "categorization": {
      "enabled": true,
      "prompt": "Categorize this bookmark into topics. Return a JSON array of category strings.",
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
    "./examples/domain-analysis.js",
    "./examples/sentiment-analysis.py"
  ],
  "output": {
    "directory": "./analysis",
    "filenamePattern": "bookmarks_analyzed_{method}_{timestamp}.json"
  }
}
```

### Environment Variables

Both export and analysis support environment variable overrides:

**Export:**

- `X_API_KEY`: X API key
- `X_API_SECRET`: X API secret
- `X_ACCESS_TOKEN`: X access token
- `X_ACCESS_SECRET`: X access secret
- `EXPORT_OUTPUT_DIR`: Output directory

**Analysis:**

- `LLM_API_KEY`: LLM API key
- `LLM_PROVIDER`: LLM provider (`openai`, `anthropic`, `custom`)
- `LLM_MODEL`: LLM model name
- `ANALYSIS_OUTPUT_DIR`: Output directory

## Custom Scripts

Custom analysis scripts can be written in any language. They receive bookmark JSON via stdin and output enriched JSON via stdout.

### Script Requirements

1. Read JSON from stdin
2. Process and enrich bookmarks
3. Write JSON to stdout
4. Exit with non-zero code on errors

### Example Scripts

See `examples/` directory for:

- `domain-analysis.js`: Categorize bookmarks by domain
- `sentiment-analysis.py`: Analyze sentiment of bookmark text

### Creating Custom Scripts

See [examples/README.md](../examples/README.md) for templates and detailed instructions.

## Examples

### Complete Workflow

```bash
# 1. Export bookmarks
export X_API_KEY="..."
export X_API_SECRET="..."
xkit bookmark-export --output-dir ./data

# 2. Analyze with LLM categorization
export LLM_API_KEY="..."
xkit bookmark-analysis \
  --input ./data/bookmarks_export_*.json \
  --method hybrid \
  --output-dir ./results

# 3. Run custom analysis
xkit bookmark-analysis \
  --input ./data/bookmarks_export_*.json \
  --scripts ./examples/domain-analysis.js,./examples/sentiment-analysis.py \
  --output-dir ./results
```

### Programmatic Usage

```typescript
import {
  BookmarkExporter,
  XAPIClient,
  RateLimiter,
  ExportState,
  ProgressReporter
} from '@brainwav/xkit/bookmark-export';

import {
  AnalysisEngine,
  LLMCategorizer,
  UsefulnessScorer,
  ScriptRunner,
  AnalysisOutputWriter
} from '@brainwav/xkit/bookmark-analysis';

// Export bookmarks
const xapiClient = new XAPIClient({
  apiKey: process.env.X_API_KEY!,
  apiSecret: process.env.X_API_SECRET!,
  accessToken: process.env.X_ACCESS_TOKEN,
  accessSecret: process.env.X_ACCESS_SECRET
});

const rateLimiter = new RateLimiter();
const exportState = new ExportState('.bookmark_export_state.json');
const progressReporter = new ProgressReporter();

const exporter = new BookmarkExporter(
  xapiClient,
  rateLimiter,
  exportState,
  progressReporter
);

const exportFile = await exporter.export('./exports');

// Analyze bookmarks
const engine = new AnalysisEngine();
const exportData = await engine.readExportFile(exportFile);

const categorizer = new LLMCategorizer({
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.LLM_API_KEY!
});

const scorer = new UsefulnessScorer({
  method: 'hybrid',
  weights: {
    engagement: 0.3,
    recency: 0.2,
    contentQuality: 0.5
  }
});

const analyzers = [categorizer, scorer];
const enrichedData = await engine.analyze(exportData, analyzers);

const writer = new AnalysisOutputWriter();
const outputFile = await writer.write(enrichedData, './analysis');
```

## API Reference

### Bookmark Export

- **XAPIClient**: X API authentication and bookmark retrieval
- **RateLimiter**: Rate limit tracking and backoff
- **ExportState**: State management for resumable exports
- **BookmarkExporter**: Main export orchestrator
- **ProgressReporter**: Progress tracking and reporting

### Bookmark Analysis

- **AnalysisEngine**: Main analysis orchestrator
- **LLMCategorizer**: LLM-based categorization
- **UsefulnessScorer**: Bookmark usefulness scoring
- **ScriptRunner**: Custom script execution
- **AnalysisOutputWriter**: Analysis output generation

For detailed API documentation, see:

- [src/bookmark-export/README.md](../src/bookmark-export/README.md)
- [src/bookmark-analysis/README.md](../src/bookmark-analysis/README.md)

## Logging

Both export and analysis operations write logs to files:

- `export.log`: Export operation logs
- `analysis.log`: Analysis operation logs

Logs include timestamps, log levels (INFO, WARN, ERROR), and contextual information.

## Error Handling

The system handles errors gracefully:

- **Authentication errors**: Clear error messages with credential requirements
- **Rate limiting**: Automatic retry with exponential backoff
- **Network errors**: Retry logic with configurable attempts
- **LLM failures**: Fallback to "uncategorized" label
- **Script failures**: Continue processing with error logging
- **Critical failures**: Write partial results with error summary

## Testing

The system includes comprehensive tests:

- **Unit tests**: Specific examples and edge cases
- **Property-based tests**: Universal correctness properties
- **Integration tests**: End-to-end workflows

Run tests:

```bash
npm test
```

Run specific test suites:

```bash
npm test -- tests/bookmark-export/
npm test -- tests/bookmark-analysis/
```

## License

MIT

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.
