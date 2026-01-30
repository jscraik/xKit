import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chunkArray,
  processBatch,
  processBatchWithResults,
  processSequentially,
  type BatchProcessorOptions,
} from '../../../src/commands/shared/batch-processor.js';

describe('batch-processor utilities', () => {
  describe('chunkArray', () => {
    it('splits array into chunks of specified size', () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const chunks = chunkArray(items, 3);
      expect(chunks).toHaveLength(4);
      expect(chunks[0]).toEqual([1, 2, 3]);
      expect(chunks[1]).toEqual([4, 5, 6]);
      expect(chunks[2]).toEqual([7, 8, 9]);
      expect(chunks[3]).toEqual([10]);
    });

    it('handles array smaller than chunk size', () => {
      const items = [1, 2, 3];
      const chunks = chunkArray(items, 10);
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toEqual([1, 2, 3]);
    });

    it('handles empty array', () => {
      const chunks = chunkArray([], 5);
      expect(chunks).toHaveLength(0);
    });

    it('handles chunk size of 1', () => {
      const items = [1, 2, 3];
      const chunks = chunkArray(items, 1);
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual([1]);
      expect(chunks[1]).toEqual([2]);
      expect(chunks[2]).toEqual([3]);
    });

    it('preserves original array', () => {
      const items = [1, 2, 3, 4, 5];
      const original = [...items];
      chunkArray(items, 2);
      expect(items).toEqual(original);
    });
  });

  describe('processBatch', () => {
    it('processes all items in parallel batches', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((x: number) => Promise.resolve(x * 2));
      const results = await processBatch(items, processor, { batchSize: 2 });
      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    it('handles processor errors gracefully', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((x: number) => {
        if (x === 3) return Promise.reject(new Error('Failed'));
        return Promise.resolve(x * 2);
      });
      const onError = vi.fn();
      const results = await processBatch(items, processor, {
        batchSize: 2,
        onError,
        continueOnError: true,
      });
      expect(results).toEqual([2, 4, 8, 10]); // 3 is excluded
      expect(onError).toHaveBeenCalledWith(expect.any(Error), 3);
    });

    it('stops on error when continueOnError is false', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((x: number) => {
        if (x === 3) return Promise.reject(new Error('Failed'));
        return Promise.resolve(x * 2);
      });
      await expect(
        processBatch(items, processor, {
          batchSize: 2,
          continueOnError: false,
        })
      ).rejects.toThrow('Failed');
    });

    it('calls onProgress callback', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = (x: number) => Promise.resolve(x * 2);
      const onProgress = vi.fn();
      await processBatch(items, processor, {
        batchSize: 2,
        onProgress,
      });
      expect(onProgress).toHaveBeenCalled();
      const calls = onProgress.mock.calls;
      // Should be called for each item completion
      expect(calls.length).toBeGreaterThan(0);
      expect(calls[calls.length - 1]).toEqual([5, 5]);
    });

    it('uses default batch size when not specified', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const processor = (x: number) => Promise.resolve(x * 2);
      const results = await processBatch(items, processor);
      expect(results).toHaveLength(10);
    });

    it('handles empty array', async () => {
      const processor = vi.fn();
      const results = await processBatch([], processor);
      expect(results).toHaveLength(0);
      expect(processor).not.toHaveBeenCalled();
    });
  });

  describe('processBatchWithResults', () => {
    it('returns successes and failures separately', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((x: number) => {
        if (x === 3) return Promise.reject(new Error('Failed'));
        return Promise.resolve(x * 2);
      });
      const result = await processBatchWithResults(items, processor, { batchSize: 2 });
      expect(result.successes).toHaveLength(4);
      expect(result.failures).toHaveLength(1);
      expect(result.successes.map((s) => s.result)).toEqual([2, 4, 8, 10]);
      expect(result.failures[0].item).toBe(3);
    });

    it('includes items in success results', async () => {
      const items = [1, 2, 3];
      const processor = (x: number) => Promise.resolve(x * 2);
      const result = await processBatchWithResults(items, processor);
      expect(result.successes).toHaveLength(3);
      expect(result.successes[0].item).toBe(1);
      expect(result.successes[0].result).toBe(2);
      expect(result.successes[1].item).toBe(2);
      expect(result.successes[1].result).toBe(4);
    });

    it('includes error objects in failures', async () => {
      const items = [1, 2, 3];
      const processor = (x: number) => {
        if (x === 2) return Promise.reject(new Error('Custom error'));
        return Promise.resolve(x);
      };
      const result = await processBatchWithResults(items, processor);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].item).toBe(2);
      expect(result.failures[0].error).toBeInstanceOf(Error);
      expect(result.failures[0].error.message).toBe('Custom error');
    });

    it('calls onProgress callback', async () => {
      const items = [1, 2, 3, 4];
      const processor = (x: number) => Promise.resolve(x * 2);
      const onProgress = vi.fn();
      await processBatchWithResults(items, processor, { onProgress });
      expect(onProgress).toHaveBeenCalled();
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall).toEqual([4, 4]);
    });

    it('handles all successes', async () => {
      const items = [1, 2, 3];
      const processor = (x: number) => Promise.resolve(x * 10);
      const result = await processBatchWithResults(items, processor);
      expect(result.successes).toHaveLength(3);
      expect(result.failures).toHaveLength(0);
    });

    it('handles all failures', async () => {
      const items = [1, 2, 3];
      const processor = () => Promise.reject(new Error('All fail'));
      const result = await processBatchWithResults(items, processor);
      expect(result.successes).toHaveLength(0);
      expect(result.failures).toHaveLength(3);
    });
  });

  describe('processSequentially', () => {
    it('processes items one at a time in order', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((x: number) => Promise.resolve(x * 2));
      const results = await processSequentially(items, processor);
      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    it('passes index to processor function', async () => {
      const items = ['a', 'b', 'c'];
      const processor = vi.fn((item: string, index: number) => Promise.resolve(`${index}:${item}`));
      const results = await processSequentially(items, processor);
      expect(results).toEqual(['0:a', '1:b', '2:c']);
      expect(processor).toHaveBeenCalledWith('a', 0);
      expect(processor).toHaveBeenCalledWith('b', 1);
      expect(processor).toHaveBeenCalledWith('c', 2);
    });

    it('maintains order even with async delays', async () => {
      const items = [1, 2, 3];
      const delays = [100, 10, 50]; // Different delays
      const processor = (x: number) =>
        new Promise<number>((resolve) => setTimeout(() => resolve(x * 2), delays[x - 1]));
      const results = await processSequentially(items, processor);
      expect(results).toEqual([2, 4, 6]);
    });

    it('calls onProgress callback', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = (x: number) => Promise.resolve(x * 2);
      const onProgress = vi.fn();
      await processSequentially(items, processor, { onProgress });
      expect(onProgress).toHaveBeenCalledTimes(5);
      expect(onProgress).toHaveBeenCalledWith(1, 5);
      expect(onProgress).toHaveBeenCalledWith(2, 5);
      expect(onProgress).toHaveBeenCalledWith(3, 5);
      expect(onProgress).toHaveBeenCalledWith(4, 5);
      expect(onProgress).toHaveBeenCalledWith(5, 5);
    });

    it('handles empty array', async () => {
      const processor = vi.fn();
      const results = await processSequentially([], processor);
      expect(results).toHaveLength(0);
      expect(processor).not.toHaveBeenCalled();
    });

    it('stops on first error', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = vi.fn((x: number) => {
        if (x === 3) throw new Error('Failed at 3');
        return Promise.resolve(x * 2);
      });
      await expect(processSequentially(items, processor)).rejects.toThrow('Failed at 3');
      expect(processor).toHaveBeenCalledTimes(3);
    });
  });

  describe('integration scenarios', () => {
    it('handles complex batching with mixed results', async () => {
      const items = Array.from({ length: 20 }, (_, i) => i + 1);
      const processor = (x: number) => {
        if (x % 7 === 0) return Promise.reject(new Error(`Failed on ${x}`));
        return Promise.resolve(x * x);
      };
      const options: BatchProcessorOptions = {
        batchSize: 5,
        onProgress: vi.fn(),
        onError: vi.fn(),
        continueOnError: true,
      };
      const results = await processBatch(items, processor, options);
      expect(results.length).toBeGreaterThan(0);
      expect(options.onProgress).toHaveBeenCalled();
      expect(options.onError).toHaveBeenCalled();
    });

    it('processes large dataset efficiently', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      let callCount = 0;
      const processor = async (x: number) => {
        callCount++;
        return x * 2;
      };
      const results = await processBatch(items, processor, { batchSize: 10 });
      expect(results).toHaveLength(100);
      expect(callCount).toBe(100);
    });
  });
});
