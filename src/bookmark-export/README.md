# Bookmark Export Module

This module provides functionality to export X (Twitter) bookmarks to structured JSON format.

## Core Types

- `BookmarkRecord`: Individual bookmark with metadata (URL, text, author, engagement metrics)
- `ExportMetadata`: Export session metadata (timestamp, count, version, user info)
- `BookmarkExport`: Complete export structure combining metadata and bookmarks
- `Credentials`: X API authentication credentials
- `RateLimitInfo`: Rate limit tracking information

## Schema Validation

The module includes JSON Schema validation using AJV:

- `export-schema.json`: Defines the structure for exported bookmark data
- `validateBookmarkExport()`: Validates data against the export schema

## Usage

```typescript
import type { BookmarkExport } from './bookmark-export/types.js';
import { validateBookmarkExport } from './bookmark-export/schema-validator.js';

const exportData: BookmarkExport = {
  metadata: {
    exportTimestamp: new Date().toISOString(),
    totalCount: 100,
    exporterVersion: '1.0.0',
    userId: 'user123',
    username: 'myusername'
  },
  bookmarks: [
    // ... bookmark records
  ]
};

// Validate before writing to file
validateBookmarkExport(exportData);
```

## Testing

Tests are located in `tests/bookmark-export/`:

- `types.test.ts`: Type structure tests
- `schema-validator.test.ts`: Schema validation tests
