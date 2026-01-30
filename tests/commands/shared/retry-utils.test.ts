import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  retryWithBackoff,
  retryWithLinearBackoff,
  isRetryableError,
  type RetryOptions,
} from '../../../src/commands/shared/retry-utils.js';

describe('retry-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('retryWithBackoff', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure with exponential backoff', async () => {
      let attemptCount = 0;
      const fn = vi.fn(() => {
        attemptCount++;
        if (attemptCount < 4) {
          return Promise.reject(new Error('ECONNRESET'));
        }
        return Promise.resolve('success');
      });

      const onRetry = vi.fn();
      // Use short initialDelay for faster tests
      const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10, onRetry });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(4);
      expect(onRetry).toHaveBeenCalledTimes(3);
    });

    it('respects maxRetries limit', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));
      const onRetry = vi.fn();

      const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 10, onRetry });

      await expect(promise).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('throws last error after exhausting retries', async () => {
      let attemptCount = 0;
      const fn = vi.fn(() => {
        attemptCount++;
        if (attemptCount <= 3) {
          return Promise.reject(new Error(`error ${attemptCount}`));
        }
        return Promise.reject(new Error('error 4'));
      });

      const promise = retryWithBackoff(fn, { maxRetries: 2, initialDelay: 10 });

      await expect(promise).rejects.toThrow('error 3');
    });

    it('respects maxDelay cap', async () => {
      let attemptCount = 0;
      const fn = vi.fn(() => {
        attemptCount++;
        if (attemptCount < 6) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      });

      const options: RetryOptions = {
        maxRetries: 5,
        initialDelay: 10,
        maxDelay: 20,
      };

      const result = await retryWithBackoff(fn, options);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(6);
    });

    it('calls onRetry callback with attempt number and error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success');

      const onRetry = vi.fn();
      await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10, onRetry });

      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
      expect(onRetry).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({ message: 'network error' }));
    });
  });

  describe('retryWithLinearBackoff', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithLinearBackoff(fn);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries with linear backoff delay', async () => {
      let attemptCount = 0;
      const fn = vi.fn(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      });

      const result = await retryWithLinearBackoff(fn, { maxRetries: 3, initialDelay: 10 });
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('respects maxRetries limit', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      const promise = retryWithLinearBackoff(fn, { maxRetries: 1, initialDelay: 10 });

      await expect(promise).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('respects maxDelay cap', async () => {
      let attemptCount = 0;
      const fn = vi.fn(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('fail'));
        }
        return Promise.resolve('success');
      });

      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 15,
        maxDelay: 20,
      };

      const result = await retryWithLinearBackoff(fn, options);
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRetryableError', () => {
    it('identifies network errors as retryable', () => {
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
      expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true);
      expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true);
    });

    it('identifies timeout errors as retryable', () => {
      expect(isRetryableError(new Error('request timeout'))).toBe(true);
      expect(isRetryableError(new Error('connection timeout'))).toBe(true);
    });

    it('identifies rate limit errors as retryable', () => {
      expect(isRetryableError(new Error('rate limit exceeded'))).toBe(true);
      expect(isRetryableError(new Error('HTTP 429'))).toBe(true);
    });

    it('identifies server errors as retryable', () => {
      expect(isRetryableError(new Error('HTTP 503'))).toBe(true);
      expect(isRetryableError(new Error('HTTP 504'))).toBe(true);
    });

    it('identifies network-related messages as retryable', () => {
      expect(isRetryableError(new Error('network error'))).toBe(true);
      expect(isRetryableError(new Error('network unreachable'))).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      expect(isRetryableError(new Error('authentication failed'))).toBe(false);
      expect(isRetryableError(new Error('not found'))).toBe(false);
      expect(isRetryableError(new Error('permission denied'))).toBe(false);
      expect(isRetryableError(new Error('HTTP 404'))).toBe(false);
      expect(isRetryableError(new Error('HTTP 401'))).toBe(false);
    });

    it('is case-insensitive when checking messages', () => {
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
      expect(isRetryableError(new Error('econnreset'))).toBe(true);
      expect(isRetryableError(new Error('Econnreset'))).toBe(true);
      expect(isRetryableError(new Error('RATE LIMIT'))).toBe(true);
      expect(isRetryableError(new Error('Rate Limit'))).toBe(true);
    });

    it('matches partial strings in error messages', () => {
      expect(isRetryableError(new Error('Connection ECONNRESET occurred'))).toBe(true);
      expect(isRetryableError(new Error('Request timed out due to ETIMEDOUT'))).toBe(true);
      expect(isRetryableError(new Error('Server returned HTTP 503'))).toBe(true);
    });
  });
});
