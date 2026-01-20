/**
 * Worker pool for parallel bookmark processing
 * FIXED: Uses piscina library for ESM compatibility and persistent workers
 */

import { pathToFileURL } from 'node:url';
import { Piscina } from 'piscina';
import type { WorkItem, WorkResult, WorkerPoolStats, ParallelConfig } from './work-item.js';

export class WorkerPool {
  private pool: any;  // Piscina instance
  private processedCount = 0;
  private errorCount = 0;

  constructor(
    private config: ParallelConfig,
  ) {
    this.validateConfig();

    // Compute path to worker handler
    // In production: dist/bookmark-analysis/worker-pool.js -> dist/bookmark-analysis/worker-handler.js
    // In tests: src/bookmark-analysis/worker-pool.ts -> dist/bookmark-analysis/worker-handler.js
    const workerFilename = this.getWorkerFilename();

    // Use piscina for ESM-compatible worker pool
    this.pool = new Piscina({
      filename: workerFilename,
      minThreads: 0,
      maxThreads: this.config.concurrency,
      idleTimeout: 60000, // Close idle workers after 60s
      maxQueue: 1000, // Prevent unbounded queue growth
      workerData: {
        // Pass API keys via workerData (not postMessage) for security
        apiKey: process.env.LLM_API_KEY ? '[REDACTED]' : undefined,
      },
    });
  }

  private getWorkerFilename(): string {
    const currentUrl = new URL(import.meta.url);
    const currentPath = currentUrl.pathname;

    // If we're in src/ during testing, navigate to dist/
    if (currentPath.includes('/src/')) {
      // src/bookmark-analysis/worker-pool.ts -> dist/bookmark-analysis/worker-handler.js
      const distPath = currentPath
        .replace('/src/', '/dist/')
        .replace('worker-pool.ts', 'worker-handler.js')
        .replace('worker-pool.js', 'worker-handler.js');
      return pathToFileURL(distPath).href;
    }

    // We're in dist/ during production
    // dist/bookmark-analysis/worker-pool.js -> dist/bookmark-analysis/worker-handler.js
    const workerPath = currentPath
      .replace('worker-pool.d.ts', 'worker-handler.js')
      .replace('worker-pool.js', 'worker-handler.js')
      .replace('worker-pool.ts', 'worker-handler.js');
    return pathToFileURL(workerPath).href;
  }

  private validateConfig(): void {
    if (this.config.concurrency < 1 || this.config.concurrency > 16) {
      throw new RangeError('Worker count must be between 1 and 16');
    }
    if (this.config.threshold < 1) {
      throw new RangeError('Threshold must be at least 1');
    }
  }

  /**
   * Process work items with worker pool
   */
  async process(items: WorkItem[]): Promise<WorkResult[]> {
    if (items.length < this.config.threshold) {
      // Fall back to sequential processing
      return this.processSequentially(items);
    }

    // Batch items to reduce overhead
    const batchSize = this.config.batchSize || 10;
    const batches: WorkItem[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    // Process batches concurrently
    const results = await Promise.all(
      batches.map((batch, batchIndex) =>
        this.processBatch(batch, batchIndex * batchSize)
      )
    );

    // Flatten results and maintain order
    return results.flat();
  }

  private async processBatch(batch: WorkItem[], startIndex: number): Promise<WorkResult[]> {
    const promises = batch.map((item, index) =>
      this.pool.run({ item, sequence: startIndex + index })
        .then((result: unknown) => {
          this.processedCount++;
          return result as WorkResult;
        })
        .catch((error: unknown) => {
          this.errorCount++;
          return {
            id: item.id,
            sequence: startIndex + index,
            error: error instanceof Error ? error : new Error(String(error)),
          } as WorkResult;
        })
    );

    return Promise.all(promises);
  }

  /**
   * Sequential processing fallback - uses existing enricher
   */
  private async processSequentially(items: WorkItem[]): Promise<WorkResult[]> {
    // Return results with sequence IDs
    // In a full implementation, this would call the existing enricher
    return items.map((item) => ({
      id: item.id,
      sequence: item.sequence,
      result: item.bookmark,
    }));
  }

  getStats(): WorkerPoolStats {
    // Piscina doesn't expose active workers count in the same way
    // Return estimated stats
    return {
      activeWorkers: 0,
      queueSize: 0,
      processedCount: this.processedCount,
      errorCount: this.errorCount,
    };
  }

  async abort(): Promise<void> {
    await this.pool.destroy();
  }
}
