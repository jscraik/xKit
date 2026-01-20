/**
 * Retry Strategy - Handles retries with exponential backoff and fallback
 */

import type { ModelTier, ModelTierType } from './model-config.js';
import type { CircuitBreaker } from './circuit-breaker.js';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial backoff delay in ms */
  initialDelay: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Maximum backoff delay in ms */
  maxDelay: number;
  /** Whether to retry on timeout errors */
  retryOnTimeout: boolean;
  /** Whether to retry on rate limit errors */
  retryOnRateLimit: boolean;
}

/**
 * Retry attempt result
 */
export interface RetryAttempt {
  attempt: number;
  success: boolean;
  error?: string;
  delay: number;
}

/**
 * Retry execution result
 */
export interface RetryResult<T> {
  /** The result from the successful attempt */
  result: T;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent including delays */
  totalTime: number;
  /** Whether fallback was used */
  fallback: boolean;
  /** Details of each attempt */
  attemptsDetail: RetryAttempt[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  backoffMultiplier: 2,
  maxDelay: 10000,
  retryOnTimeout: true,
  retryOnRateLimit: true,
};

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error, config: RetryConfig): boolean {
  const message = error.message.toLowerCase();

  // Timeout errors
  if (config.retryOnTimeout && (message.includes('timeout') || message.includes('timed out'))) {
    return true;
  }

  // Rate limit errors
  if (config.retryOnRateLimit && (
    message.includes('rate limit') ||
    message.includes('429') ||
    message.includes('too many requests')
  )) {
    return true;
  }

  // Server errors (5xx)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true;
  }

  // Network errors
  if (message.includes('econnrefused') || message.includes('enotfound') || message.includes('etimedout')) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff
 */
export function calculateBackoff(
  attempt: number,
  config: RetryConfig,
): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep for specified ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute operation with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  const attemptsDetail: RetryAttempt[] = [];
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    const attemptStart = Date.now();

    try {
      const result = await operation();
      const attemptTime = Date.now() - attemptStart;

      attemptsDetail.push({
        attempt,
        success: true,
        delay: attemptTime,
      });

      return {
        result,
        attempts: attempt,
        totalTime: Date.now() - startTime,
        fallback: false,
        attemptsDetail,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;
      const attemptTime = Date.now() - attemptStart;

      attemptsDetail.push({
        attempt,
        success: false,
        error: err.message,
        delay: attemptTime,
      });

      // Don't retry if this is the last attempt or error is not retryable
      if (attempt >= config.maxAttempts || !isRetryableError(err, config)) {
        break;
      }

      // Calculate backoff and wait before retry
      const backoff = calculateBackoff(attempt, config);
      console.warn(`Attempt ${attempt} failed: ${err.message}. Retrying in ${backoff}ms...`);
      await sleep(backoff);
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Execute operation with retry and fallback across model tiers
 */
export async function executeWithFallback<T>(
  tiers: ModelTier[],
  circuitBreakers: Map<string, CircuitBreaker>,
  executeWithTier: (tier: ModelTier) => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  const allAttempts: RetryAttempt[] = [];
  let lastError: Error | undefined;

  for (const tier of tiers) {
    const breaker = circuitBreakers.get(tier.name);
    if (breaker?.isOpen()) {
      console.warn(`Circuit breaker open for ${tier.name}, skipping...`);
      continue;
    }

    try {
      const result = await executeWithRetry(
        () => executeWithTier(tier),
        config,
      );

      // Merge attempt details
      allAttempts.push(...result.attemptsDetail);

      return {
        ...result,
        totalTime: Date.now() - startTime,
        fallback: tier !== tiers[0],
        attemptsDetail: allAttempts,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      allAttempts.push(...(lastError as any).attemptsDetail || []);

      // Trip the circuit breaker if configured
      if (breaker && config.maxAttempts > 0) {
        // Circuit breaker tracks its own failures via execute()
      }

      // Try next tier
      continue;
    }
  }

  throw lastError || new Error('All model tiers failed');
}
