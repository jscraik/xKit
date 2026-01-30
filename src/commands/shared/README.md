# Shared Command Utilities

Reusable utilities for xKit command implementations. These utilities were extracted from the profile-sweep command improvements and are designed to be used across all commands.

## Modules

### ProgressTracker

Real-time progress tracking with ETA calculation.

```typescript
import { ProgressTracker } from './shared/index.js';

const progress = new ProgressTracker(100, 'Processing');
for (const item of items) {
    await processItem(item);
    progress.increment();
}
progress.complete();
```

**Features:**

- Real-time progress display
- Percentage completion
- Elapsed time tracking
- ETA calculation
- Processing rate (items/second)

### ErrorLogger

Structured error logging with operation categorization.

```typescript
import { ErrorLogger } from './shared/index.js';

const errorLogger = new ErrorLogger(outputDir);

try {
    await riskyOperation();
} catch (error) {
    errorLogger.log('operation-name', error.message, contextUrl);
}

errorLogger.save(); // Writes to errors.log
console.log(`Errors: ${errorLogger.getCount()}`);
```

**Features:**

- Timestamped error logs
- Operation categorization
- Optional context (URLs, IDs)
- Error summary by operation type
- Non-blocking (operations continue on errors)

### CheckpointManager

Checkpoint/resume support for long-running operations.

```typescript
import { CheckpointManager } from './shared/index.js';

const checkpointManager = new CheckpointManager(outputDir, 'operation-id');

// Check for resume
if (options.resume) {
    const checkpoint = checkpointManager.load();
    if (checkpoint) {
        console.log(`Resuming from ${checkpoint.itemsProcessed} items`);
        // Resume from checkpoint
    }
}

// Save checkpoint during processing
checkpointManager.save({
    itemsProcessed: 50,
    lastItemId: 'abc123',
    lastUpdated: new Date().toISOString(),
});

// Clear on success
checkpointManager.clear();
```

**Features:**

- JSON-based checkpoint storage
- Automatic timestamp tracking
- Custom checkpoint fields
- Resume from interruption
- Auto-cleanup on completion

### Retry Utilities

Retry failed operations with exponential or linear backoff.

```typescript
import { retryWithBackoff, isRetryableError } from './shared/index.js';

const result = await retryWithBackoff(
    async () => await fetchData(url),
    {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        onRetry: (attempt, error) => {
            console.log(`Retry ${attempt}: ${error.message}`);
        }
    }
);
```

**Features:**

- Exponential backoff (default)
- Linear backoff (alternative)
- Configurable retry count
- Configurable delays
- Retry callbacks for logging
- Retryable error detection

### Deduplication

Remove duplicate items based on key extraction.

```typescript
import { deduplicateByKey, getDeduplicationStats } from './shared/index.js';

// Deduplicate by custom key
const unique = deduplicateByKey(items, (item) => item.id);

// Deduplicate by property
const uniqueByUrl = deduplicateByProperty(items, 'url');

// Get statistics
const stats = getDeduplicationStats(items, unique);
console.log(`Removed ${stats.duplicateCount} duplicates`);
```

**Features:**

- Key-based deduplication
- Property-based deduplication
- Find duplicates
- Group by key
- Deduplication statistics

### Batch Processor

Process items in parallel batches with concurrency control.

```typescript
import { processBatch } from './shared/index.js';

const results = await processBatch(
    items,
    async (item) => await processItem(item),
    {
        batchSize: 5,
        onProgress: (completed, total) => {
            console.log(`Progress: ${completed}/${total}`);
        },
        onError: (error, item) => {
            console.error(`Failed to process ${item.id}: ${error.message}`);
        },
        continueOnError: true
    }
);
```

**Features:**

- Parallel batch processing
- Configurable concurrency
- Progress callbacks
- Error callbacks
- Continue on error option
- Sequential processing option
- Success/failure separation

## Usage Patterns

### Pattern 1: Basic Command with Progress

```typescript
import { ProgressTracker, ErrorLogger } from './shared/index.js';

const progress = new ProgressTracker(items.length, 'Processing');
const errorLogger = new ErrorLogger(outputDir);

for (const item of items) {
    try {
        await processItem(item);
    } catch (error) {
        errorLogger.log('processing', error.message, item.id);
    }
    progress.increment();
}

errorLogger.save();
```

### Pattern 2: Batch Processing with Retry

```typescript
import { processBatch, retryWithBackoff, ErrorLogger } from './shared/index.js';

const errorLogger = new ErrorLogger(outputDir);

const results = await processBatch(
    items,
    async (item) => {
        return retryWithBackoff(
            async () => await fetchData(item.url),
            {
                maxRetries: 3,
                onRetry: (attempt, error) => {
                    errorLogger.log('retry', `Attempt ${attempt}: ${error.message}`, item.url);
                }
            }
        );
    },
    {
        batchSize: 5,
        onError: (error, item) => {
            errorLogger.log('batch-processing', error.message, item.url);
        }
    }
);

errorLogger.save();
```

### Pattern 3: Resumable Operation

```typescript
import { CheckpointManager, ProgressTracker, ErrorLogger } from './shared/index.js';

const checkpointManager = new CheckpointManager(outputDir, 'operation');
const errorLogger = new ErrorLogger(outputDir);

// Load checkpoint
let startIndex = 0;
if (options.resume) {
    const checkpoint = checkpointManager.load();
    if (checkpoint) {
        startIndex = checkpoint.itemsProcessed;
        console.log(`Resuming from item ${startIndex}`);
    }
}

const progress = new ProgressTracker(items.length - startIndex, 'Processing');

for (let i = startIndex; i < items.length; i++) {
    try {
        await processItem(items[i]);
    } catch (error) {
        errorLogger.log('processing', error.message, items[i].id);
    }
    
    progress.increment();
    
    // Save checkpoint every 10 items
    if (i % 10 === 0) {
        checkpointManager.save({
            itemsProcessed: i + 1,
            lastUpdated: new Date().toISOString(),
        });
    }
}

checkpointManager.clear();
errorLogger.save();
```

### Pattern 4: Deduplication with Statistics

```typescript
import { deduplicateByKey, getDeduplicationStats } from './shared/index.js';

// Deduplicate
const unique = deduplicateByKey(items, (item) => item.url);

// Report statistics
const stats = getDeduplicationStats(items, unique);
if (stats.duplicateCount > 0) {
    console.log(`Deduplicated to ${stats.uniqueCount} unique items`);
    console.log(`Removed ${stats.duplicateCount} duplicates (${(stats.deduplicationRate * 100).toFixed(1)}%)`);
}
```

## Design Principles

1. **Single Responsibility**: Each utility has one clear purpose
2. **Composability**: Utilities work well together
3. **Type Safety**: Full TypeScript support with proper types
4. **Error Handling**: Graceful degradation, non-blocking
5. **Performance**: Efficient implementations
6. **Testability**: Easy to unit test
7. **Reusability**: Generic, not command-specific

## Testing

Each utility module should have corresponding tests:

```
tests/commands/shared/
├── progress-tracker.test.ts
├── error-logger.test.ts
├── checkpoint-manager.test.ts
├── retry-utils.test.ts
├── deduplication.test.ts
└── batch-processor.test.ts
```

## Migration Guide

To migrate existing commands to use shared utilities:

1. **Replace inline progress tracking:**

   ```typescript
   // Before
   console.log(`Progress: ${i}/${total}`);
   
   // After
   import { ProgressTracker } from './shared/index.js';
   const progress = new ProgressTracker(total, 'Operation');
   progress.increment();
   ```

2. **Replace inline error handling:**

   ```typescript
   // Before
   const errors = [];
   errors.push({ operation: 'fetch', error: e.message });
   
   // After
   import { ErrorLogger } from './shared/index.js';
   const errorLogger = new ErrorLogger(outputDir);
   errorLogger.log('fetch', e.message, url);
   ```

3. **Add retry logic:**

   ```typescript
   // Before
   const result = await fetchData(url);
   
   // After
   import { retryWithBackoff } from './shared/index.js';
   const result = await retryWithBackoff(
       async () => await fetchData(url),
       { maxRetries: 3 }
   );
   ```

4. **Add deduplication:**

   ```typescript
   // Before
   const seen = new Set();
   const unique = items.filter(item => {
       if (seen.has(item.id)) return false;
       seen.add(item.id);
       return true;
   });
   
   // After
   import { deduplicateByKey } from './shared/index.js';
   const unique = deduplicateByKey(items, (item) => item.id);
   ```

## Contributing

When adding new shared utilities:

1. Create a new file in `src/commands/shared/`
2. Export from `src/commands/shared/index.ts`
3. Add documentation to this README
4. Add unit tests
5. Update at least one command to use it
6. Document usage patterns

## See Also

- [Profile Sweep Improvements](../../../PROFILE_SWEEP_IMPROVEMENTS.md)
- [Command Improvement Opportunities](../../../COMMAND_IMPROVEMENT_OPPORTUNITIES.md)
- [Improvement Action Plan](../../../IMPROVEMENT_ACTION_PLAN.md)
