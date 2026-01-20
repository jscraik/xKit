/**
 * Parallel processing work items
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';

export interface WorkItem {
  id: string;
  sequence: number;
  bookmark: BookmarkRecord;
}

export interface WorkResult {
  id: string;
  sequence: number;
  result?: any;
  error?: Error;
}

export interface ParallelConfig {
  enabled: boolean;
  concurrency: number;
  threshold: number;
  batchSize: number;
}

export interface WorkerPoolStats {
  activeWorkers: number;
  queueSize: number;
  processedCount: number;
  errorCount: number;
}
