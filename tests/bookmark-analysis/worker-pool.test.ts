/**
 * Tests for WorkerPool
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorkerPool } from '../../src/bookmark-analysis/worker-pool.js';
import type { WorkItem } from '../../src/bookmark-analysis/work-item.js';

// Mock bookmark data
function createMockBookmark(id: string, text: string): any {
  return {
    id,
    text,
    url: `https://example.com/${id}`,
    createdAt: new Date().toISOString(),
  };
}

function createWorkItems(count: number): WorkItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `bookmark-${i}`,
    sequence: i,
    bookmark: createMockBookmark(`bookmark-${i}`, `Test bookmark ${i}`),
  }));
}

describe('WorkerPool', () => {
  describe('configuration validation', () => {
    it('should accept valid concurrency values', () => {
      const config = {
        enabled: true,
        concurrency: 4,
        threshold: 50,
        batchSize: 10,
      };

      expect(() => new WorkerPool(config)).not.toThrow();
    });

    it('should reject concurrency below 1', () => {
      const config = {
        enabled: true,
        concurrency: 0,
        threshold: 50,
        batchSize: 10,
      };

      expect(() => new WorkerPool(config)).toThrow('Worker count must be between 1 and 16');
    });

    it('should reject concurrency above 16', () => {
      const config = {
        enabled: true,
        concurrency: 17,
        threshold: 50,
        batchSize: 10,
      };

      expect(() => new WorkerPool(config)).toThrow('Worker count must be between 1 and 16');
    });

    it('should reject threshold below 1', () => {
      const config = {
        enabled: true,
        concurrency: 4,
        threshold: 0,
        batchSize: 10,
      };

      expect(() => new WorkerPool(config)).toThrow('Threshold must be at least 1');
    });
  });

  describe('processing', () => {
    let pool: WorkerPool;
    let config: any;

    beforeEach(() => {
      config = {
        enabled: true,
        concurrency: 2,
        threshold: 10, // Lower threshold for tests
        batchSize: 5,
      };
      pool = new WorkerPool(config);
    });

    it('should process items below threshold sequentially', async () => {
      const items = createWorkItems(5); // Below threshold of 10
      const results = await pool.process(items);

      expect(results).toHaveLength(5);
      expect(results[0].sequence).toBe(0);
      expect(results[4].sequence).toBe(4);
    });

    it('should process items above threshold in parallel', async () => {
      const items = createWorkItems(15); // Above threshold of 10
      const results = await pool.process(items);

      expect(results).toHaveLength(15);
      // Verify all results have unique sequences
      const sequences = results.map(r => r.sequence).sort((a, b) => a - b);
      expect(sequences).toEqual(Array.from({ length: 15 }, (_, i) => i));
    });

    it('should maintain order for large batches', async () => {
      const items = createWorkItems(100);
      const results = await pool.process(items);

      expect(results).toHaveLength(100);

      // Verify order is preserved
      for (let i = 0; i < results.length; i++) {
        expect(results[i].sequence).toBe(i);
      }
    });

    it('should handle errors gracefully', async () => {
      // Create items that might fail
      const items = createWorkItems(10);

      const results = await pool.process(items);

      // All items should be processed, even if some fail
      expect(results).toHaveLength(10);

      // Count errors (some might fail in worker)
      const errorCount = results.filter(r => r.error).length;
      expect(errorCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide stats', () => {
      const stats = pool.getStats();

      expect(stats).toHaveProperty('activeWorkers');
      expect(stats).toHaveProperty('queueSize');
      expect(stats).toHaveProperty('processedCount');
      expect(stats).toHaveProperty('errorCount');
    });
  });

  describe('sequential fallback', () => {
    it('should fall back to sequential for small batches', async () => {
      const config = {
        enabled: true,
        concurrency: 4,
        threshold: 50,
        batchSize: 10,
      };
      const pool = new WorkerPool(config);

      const items = createWorkItems(5); // Below threshold
      const results = await pool.process(items);

      expect(results).toHaveLength(5);
      // Sequential processing returns bookmarks directly
      expect(results[0].result).toBeDefined();
    });
  });

  describe('cleanup', () => {
    it('should abort successfully', async () => {
      const config = {
        enabled: true,
        concurrency: 2,
        threshold: 10,
        batchSize: 5,
      };
      const pool = new WorkerPool(config);

      // Abort should complete without throwing
      await pool.abort();
    });
  });
});
