/**
 * Shared command utilities
 * Reusable components for command implementations
 */

// Progress tracking
export { ProgressTracker } from './progress-tracker.js';

// Error logging
export { ErrorLogger } from './error-logger.js';
export type { ErrorLog } from './error-logger.js';

// Checkpoint/resume support
export { CheckpointManager } from './checkpoint-manager.js';
export type { Checkpoint } from './checkpoint-manager.js';

// Retry utilities
export {
    isRetryableError, retryWithBackoff,
    retryWithLinearBackoff
} from './retry-utils.js';
export type { RetryOptions } from './retry-utils.js';

// Deduplication
export {
    deduplicateByKey,
    deduplicateByProperty,
    findDuplicates, getDeduplicationStats, groupByKey
} from './deduplication.js';

// Batch processing
export {
    chunkArray, processBatch,
    processBatchWithResults,
    processSequentially
} from './batch-processor.js';
export type { BatchProcessorOptions } from './batch-processor.js';

