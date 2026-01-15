/**
 * Error types and utilities for bookmark export
 */

/**
 * Base error class for bookmark export errors
 */
export class BookmarkExportError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'BookmarkExportError';
  }
}

/**
 * Network error that may be retryable
 */
export class NetworkError extends BookmarkExportError {
  constructor(message: string, operation: string, cause?: Error) {
    super(message, operation, cause);
    this.name = 'NetworkError';
  }
}

/**
 * API error with status code
 */
export class APIError extends BookmarkExportError {
  constructor(
    message: string,
    operation: string,
    public readonly statusCode: number,
    cause?: Error,
  ) {
    super(message, operation, cause);
    this.name = 'APIError';
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends BookmarkExportError {
  constructor(message: string, operation: string, cause?: Error) {
    super(message, operation, cause);
    this.name = 'AuthenticationError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends BookmarkExportError {
  constructor(
    message: string,
    operation: string,
    public readonly resetAt: number,
    cause?: Error,
  ) {
    super(message, operation, cause);
    this.name = 'RateLimitError';
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  // Network errors are retryable
  if (error instanceof NetworkError) {
    return true;
  }

  // Some API errors are retryable (500, 502, 503, 504)
  if (error instanceof APIError) {
    return error.statusCode >= 500 && error.statusCode < 600;
  }

  // Check for common network error messages
  const message = error.message.toLowerCase();
  const networkErrorPatterns = ['network', 'timeout', 'econnreset', 'econnrefused', 'etimedout', 'socket hang up'];

  return networkErrorPatterns.some((pattern) => message.includes(pattern));
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const delay = config.initialDelayMs * config.backoffMultiplier ** attempt;
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operation: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error, delayMs: number) => void,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry if error is not retryable
      if (!isRetryableError(lastError)) {
        throw lastError;
      }

      // Don't retry if we've exhausted attempts
      if (attempt >= config.maxRetries) {
        throw lastError;
      }

      // Calculate delay and wait
      const delayMs = calculateBackoffDelay(attempt, config);
      if (onRetry) {
        onRetry(attempt + 1, lastError, delayMs);
      }

      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error(`${operation} failed after ${config.maxRetries} retries`);
}
