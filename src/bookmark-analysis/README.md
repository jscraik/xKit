# Bookmark Analysis Module

This module provides functionality to analyze exported bookmarks using LLM categorization, usefulness scoring, and custom scripts.

## Core Types

- `EnrichedBookmarkRecord`: Bookmark with analysis results (categories, scores, custom fields)
- `AnalysisMetadata`: Analysis session metadata extending export metadata
- `AnalysisExport`: Complete analysis output structure
- `AnalysisResult`: Result from an individual analyzer
- `LLMConfig`: Configuration for LLM-based analysis
- `ScoringConfig`: Configuration for usefulness scoring

## Schema Validation

The module includes JSON Schema validation using AJV:

- `analysis-schema.json`: Defines the structure for analyzed bookmark data
- `validateAnalysisExport()`: Validates data against the analysis schema

## Usage

```typescript
import type { AnalysisExport, EnrichedBookmarkRecord } from './bookmark-analysis/types.js';
import { validateAnalysisExport } from './bookmark-analysis/schema-validator.js';

const analysisData: AnalysisExport = {
  metadata: {
    // ... export metadata
    analysisTimestamp: new Date().toISOString(),
    categoriesApplied: ['programming', 'typescript'],
    scoringMethod: 'hybrid',
    analyzersUsed: ['llm-categorizer', 'usefulness-scorer']
  },
  bookmarks: [
    // ... enriched bookmark records with categories and scores
  ]
};

// Validate before writing to file
validateAnalysisExport(analysisData);
```

## Testing

Tests are located in `tests/bookmark-analysis/`:

- `types.test.ts`: Type structure tests
- `schema-validator.test.ts`: Schema validation tests
