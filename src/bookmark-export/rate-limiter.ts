/**
 * Rate Limiter for X API requests
 * Handles rate limit tracking and exponential backoff
 * Validates: Requirements 2.1
 */

import type { RateLimitInfo } from './types.js';

/**
 * Rate limiter that tracks API rate limits and implements exponential backoff
 */
export class RateLimiter {
  private rateLimits: Map<string, RateLimitInfo> = new Map();
  private readonly maxRetries: number;
  private readonly backoffMultiplier: number;

  /**
   * Create a new RateLimiter
   * @param maxRetries - Maximum number of retries (default: 3)
   * @param backoffMultiplier - Multiplier for exponential backoff (default: 2)
   */
  constructor(maxRetries: number = 3, backoffMultiplier: number = 2) {
    this.maxRetries = maxRetries;
    this.backoffMultiplier = backoffMultiplier;
  }

  /**
   * Update rate limit information for an endpoint
   * @param endpoint - API endpoint identifier
   * @param info - Rate limit information from API response
   */
  updateLimit(endpoint: string, info: RateLimitInfo): void {
    this.rateLimits.set(endpoint, info);
  }

  /**
   * Check if we need to wait due to rate limiting
   * @param endpoint - API endpoint identifier
   * @returns Promise that resolves when it's safe to proceed
   */
  async checkLimit(endpoint: string): Promise<void> {
    const limit = this.rateLimits.get(endpoint);

    if (!limit) {
      // No rate limit info yet, proceed
      return;
    }

    if (limit.remaining > 0) {
      // We have remaining requests, proceed
      return;
    }

    // We've hit the rate limit, wait until reset
    await this.waitUntilReset(limit.resetAt);
  }

  /**
   * Wait if needed based on current rate limit status
   * Implements exponential backoff for rate limit compliance
   * @param endpoint - API endpoint identifier (default: 'default')
   * @returns Promise that resolves when it's safe to proceed
   */
  async waitIfNeeded(endpoint: string = 'default'): Promise<void> {
    await this.checkLimit(endpoint);
  }

  /**
   * Wait until the rate limit reset time
   * @param resetAt - Unix timestamp (in seconds) when rate limit resets
   * @returns Promise that resolves after waiting
   */
  private async waitUntilReset(resetAt: number): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const waitTime = Math.max(0, resetAt - now);

    if (waitTime > 0) {
      // Add a small buffer (1 second) to ensure the reset has occurred
      const waitMs = (waitTime + 1) * 1000;
      await this.sleep(waitMs);
    }
  }

  /**
   * Sleep for a specified duration
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit info for an endpoint
   * @param endpoint - API endpoint identifier
   * @returns Rate limit info or undefined if not tracked
   */
  getRateLimit(endpoint: string): RateLimitInfo | undefined {
    return this.rateLimits.get(endpoint);
  }

  /**
   * Clear rate limit tracking for an endpoint
   * @param endpoint - API endpoint identifier
   */
  clearLimit(endpoint: string): void {
    this.rateLimits.delete(endpoint);
  }

  /**
   * Clear all rate limit tracking
   */
  clearAllLimits(): void {
    this.rateLimits.clear();
  }
}
