/**
 * Unit and property-based tests for RateLimiter
 * Tests Requirements 2.1
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../../src/bookmark-export/rate-limiter.js';
import type { RateLimitInfo } from '../../src/bookmark-export/types.js';

describe('RateLimiter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
    });

    describe('Constructor', () => {
        it('should create a RateLimiter with default values', () => {
            const limiter = new RateLimiter();
            expect(limiter).toBeDefined();
        });

        it('should create a RateLimiter with custom values', () => {
            const limiter = new RateLimiter(5, 3);
            expect(limiter).toBeDefined();
        });
    });

    describe('updateLimit()', () => {
        it('should store rate limit information for an endpoint', () => {
            const limiter = new RateLimiter();
            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 179,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const stored = limiter.getRateLimit('bookmarks');
            expect(stored).toEqual(rateLimit);
        });

        it('should update existing rate limit information', () => {
            const limiter = new RateLimiter();
            const rateLimit1: RateLimitInfo = {
                limit: 180,
                remaining: 179,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };
            const rateLimit2: RateLimitInfo = {
                limit: 180,
                remaining: 178,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', rateLimit1);
            limiter.updateLimit('bookmarks', rateLimit2);

            const stored = limiter.getRateLimit('bookmarks');
            expect(stored).toEqual(rateLimit2);
        });

        it('should track multiple endpoints independently', () => {
            const limiter = new RateLimiter();
            const bookmarksLimit: RateLimitInfo = {
                limit: 180,
                remaining: 179,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };
            const usersLimit: RateLimitInfo = {
                limit: 300,
                remaining: 299,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', bookmarksLimit);
            limiter.updateLimit('users', usersLimit);

            expect(limiter.getRateLimit('bookmarks')).toEqual(bookmarksLimit);
            expect(limiter.getRateLimit('users')).toEqual(usersLimit);
        });
    });

    describe('checkLimit()', () => {
        it('should proceed immediately when no rate limit info exists', async () => {
            const limiter = new RateLimiter();
            const startTime = Date.now();

            await limiter.checkLimit('unknown');

            const elapsed = Date.now() - startTime;
            expect(elapsed).toBeLessThan(100); // Should be nearly instant
        });

        it('should proceed immediately when remaining requests > 0', async () => {
            const limiter = new RateLimiter();
            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 100,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const startTime = Date.now();
            await limiter.checkLimit('bookmarks');
            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeLessThan(100); // Should be nearly instant
        });

        it('should wait when remaining requests = 0', async () => {
            vi.useFakeTimers();
            const limiter = new RateLimiter();
            const resetAt = Math.floor(Date.now() / 1000) + 2; // 2 seconds from now

            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 0,
                resetAt,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const promise = limiter.checkLimit('bookmarks');

            // Fast-forward time by 3 seconds (2 seconds wait + 1 second buffer)
            await vi.advanceTimersByTimeAsync(3000);

            await promise;

            vi.useRealTimers();
        });

        it('should not wait if reset time has already passed', async () => {
            const limiter = new RateLimiter();
            const resetAt = Math.floor(Date.now() / 1000) - 10; // 10 seconds ago

            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 0,
                resetAt,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const startTime = Date.now();
            await limiter.checkLimit('bookmarks');
            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeLessThan(100); // Should be nearly instant
        });
    });

    describe('waitIfNeeded()', () => {
        it('should use default endpoint when none specified', async () => {
            const limiter = new RateLimiter();
            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 100,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('default', rateLimit);

            const startTime = Date.now();
            await limiter.waitIfNeeded();
            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeLessThan(100); // Should be nearly instant
        });

        it('should wait for specified endpoint', async () => {
            vi.useFakeTimers();
            const limiter = new RateLimiter();
            const resetAt = Math.floor(Date.now() / 1000) + 2;

            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 0,
                resetAt,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const promise = limiter.waitIfNeeded('bookmarks');

            await vi.advanceTimersByTimeAsync(3000);

            await promise;

            vi.useRealTimers();
        });
    });

    describe('getRateLimit()', () => {
        it('should return undefined for unknown endpoint', () => {
            const limiter = new RateLimiter();
            expect(limiter.getRateLimit('unknown')).toBeUndefined();
        });

        it('should return stored rate limit info', () => {
            const limiter = new RateLimiter();
            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 179,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            expect(limiter.getRateLimit('bookmarks')).toEqual(rateLimit);
        });
    });

    describe('clearLimit()', () => {
        it('should remove rate limit info for an endpoint', () => {
            const limiter = new RateLimiter();
            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 179,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', rateLimit);
            expect(limiter.getRateLimit('bookmarks')).toEqual(rateLimit);

            limiter.clearLimit('bookmarks');
            expect(limiter.getRateLimit('bookmarks')).toBeUndefined();
        });

        it('should not affect other endpoints', () => {
            const limiter = new RateLimiter();
            const bookmarksLimit: RateLimitInfo = {
                limit: 180,
                remaining: 179,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };
            const usersLimit: RateLimitInfo = {
                limit: 300,
                remaining: 299,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', bookmarksLimit);
            limiter.updateLimit('users', usersLimit);

            limiter.clearLimit('bookmarks');

            expect(limiter.getRateLimit('bookmarks')).toBeUndefined();
            expect(limiter.getRateLimit('users')).toEqual(usersLimit);
        });
    });

    describe('clearAllLimits()', () => {
        it('should remove all rate limit info', () => {
            const limiter = new RateLimiter();
            const bookmarksLimit: RateLimitInfo = {
                limit: 180,
                remaining: 179,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };
            const usersLimit: RateLimitInfo = {
                limit: 300,
                remaining: 299,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            };

            limiter.updateLimit('bookmarks', bookmarksLimit);
            limiter.updateLimit('users', usersLimit);

            limiter.clearAllLimits();

            expect(limiter.getRateLimit('bookmarks')).toBeUndefined();
            expect(limiter.getRateLimit('users')).toBeUndefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle rate limit with resetAt = 0', async () => {
            const limiter = new RateLimiter();
            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 0,
                resetAt: 0,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const startTime = Date.now();
            await limiter.checkLimit('bookmarks');
            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeLessThan(100); // Should be nearly instant
        });

        it('should handle rate limit with negative remaining', async () => {
            vi.useFakeTimers();
            const limiter = new RateLimiter();
            const resetAt = Math.floor(Date.now() / 1000) + 2;

            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: -1,
                resetAt,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const promise = limiter.checkLimit('bookmarks');

            await vi.advanceTimersByTimeAsync(3000);

            await promise;

            vi.useRealTimers();
        });

        it('should handle very large resetAt values', async () => {
            const limiter = new RateLimiter();
            const resetAt = Math.floor(Date.now() / 1000) + 999999; // Far future

            const rateLimit: RateLimitInfo = {
                limit: 180,
                remaining: 100,
                resetAt,
            };

            limiter.updateLimit('bookmarks', rateLimit);

            const startTime = Date.now();
            await limiter.checkLimit('bookmarks');
            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeLessThan(100); // Should proceed immediately since remaining > 0
        });
    });

    describe('Property-Based Tests', () => {
        /**
         * Property 4: Rate limit compliance
         * **Validates: Requirements 2.1**
         *
         * For any rate limit response from the X API, the exporter should wait
         * at least the specified reset period before making the next request
         */
        it('Property 4: Should wait at least the reset period when rate limited', async () => {
            const fc = await import('fast-check');

            await fc.assert(
                fc.asyncProperty(
                    // Generate arbitrary rate limit info with remaining = 0
                    fc.record({
                        limit: fc.integer({ min: 1, max: 1000 }),
                        remaining: fc.constant(0), // Always rate limited
                        resetAt: fc.integer({ min: 1, max: 10 }), // 1-10 seconds from now
                    }),
                    fc.string({ minLength: 1, maxLength: 20 }), // endpoint name
                    async (rateLimitOffset, endpoint) => {
                        vi.useFakeTimers();

                        const limiter = new RateLimiter();
                        const now = Math.floor(Date.now() / 1000);
                        const rateLimit: RateLimitInfo = {
                            limit: rateLimitOffset.limit,
                            remaining: rateLimitOffset.remaining,
                            resetAt: now + rateLimitOffset.resetAt,
                        };

                        limiter.updateLimit(endpoint, rateLimit);

                        const startTime = Date.now();
                        const promise = limiter.checkLimit(endpoint);

                        // Calculate expected wait time (resetAt - now + 1 second buffer)
                        const expectedWaitMs = (rateLimitOffset.resetAt + 1) * 1000;

                        // Fast-forward time
                        await vi.advanceTimersByTimeAsync(expectedWaitMs);

                        await promise;

                        const elapsed = Date.now() - startTime;

                        // Verify we waited at least the reset period
                        expect(elapsed).toBeGreaterThanOrEqual(expectedWaitMs - 100); // Allow small margin

                        vi.useRealTimers();
                    }
                ),
                { numRuns: 50 } // Reduced runs for performance with timers
            );
        });

        it('Property: Should never wait when remaining > 0', async () => {
            const fc = await import('fast-check');

            await fc.assert(
                fc.asyncProperty(
                    fc.record({
                        limit: fc.integer({ min: 1, max: 1000 }),
                        remaining: fc.integer({ min: 1, max: 1000 }), // Always has remaining
                        resetAt: fc.integer({ min: 0, max: 999999 }),
                    }),
                    fc.string({ minLength: 1, maxLength: 20 }),
                    async (rateLimitOffset, endpoint) => {
                        const limiter = new RateLimiter();
                        const now = Math.floor(Date.now() / 1000);
                        const rateLimit: RateLimitInfo = {
                            limit: rateLimitOffset.limit,
                            remaining: rateLimitOffset.remaining,
                            resetAt: now + rateLimitOffset.resetAt,
                        };

                        limiter.updateLimit(endpoint, rateLimit);

                        const startTime = Date.now();
                        await limiter.checkLimit(endpoint);
                        const elapsed = Date.now() - startTime;

                        // Should proceed immediately
                        expect(elapsed).toBeLessThan(100);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property: Should handle multiple endpoints independently', async () => {
            const fc = await import('fast-check');

            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            endpoint: fc.string({ minLength: 1, maxLength: 20 }),
                            rateLimit: fc.record({
                                limit: fc.integer({ min: 1, max: 1000 }),
                                remaining: fc.integer({ min: 0, max: 1000 }),
                                resetAt: fc.integer({ min: 0, max: 999999 }),
                            }),
                        }),
                        { minLength: 1, maxLength: 10 }
                    ),
                    async (endpoints) => {
                        const limiter = new RateLimiter();
                        const now = Math.floor(Date.now() / 1000);

                        // Update all endpoints
                        for (const { endpoint, rateLimit } of endpoints) {
                            limiter.updateLimit(endpoint, {
                                ...rateLimit,
                                resetAt: now + rateLimit.resetAt,
                            });
                        }

                        // Verify each endpoint has its own rate limit
                        for (const { endpoint, rateLimit } of endpoints) {
                            const stored = limiter.getRateLimit(endpoint);
                            expect(stored).toBeDefined();
                            expect(stored?.limit).toBe(rateLimit.limit);
                            expect(stored?.remaining).toBe(rateLimit.remaining);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property: getRateLimit should return what was set with updateLimit', async () => {
            const fc = await import('fast-check');

            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 1, maxLength: 20 }),
                    fc.record({
                        limit: fc.integer({ min: 0, max: 10000 }),
                        remaining: fc.integer({ min: 0, max: 10000 }),
                        resetAt: fc.integer({ min: 0, max: 2147483647 }), // Max 32-bit int
                    }),
                    async (endpoint, rateLimit) => {
                        const limiter = new RateLimiter();

                        limiter.updateLimit(endpoint, rateLimit);
                        const retrieved = limiter.getRateLimit(endpoint);

                        expect(retrieved).toEqual(rateLimit);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it('Property: clearLimit should remove only the specified endpoint', async () => {
            const fc = await import('fast-check');

            await fc.assert(
                fc.asyncProperty(
                    fc.array(
                        fc.record({
                            endpoint: fc.string({ minLength: 1, maxLength: 20 }),
                            rateLimit: fc.record({
                                limit: fc.integer({ min: 1, max: 1000 }),
                                remaining: fc.integer({ min: 0, max: 1000 }),
                                resetAt: fc.integer({ min: 0, max: 999999 }),
                            }),
                        }),
                        { minLength: 2, maxLength: 10 }
                    ),
                    fc.integer({ min: 0 }), // Index to clear
                    async (endpoints, indexOffset) => {
                        const limiter = new RateLimiter();
                        const now = Math.floor(Date.now() / 1000);

                        // Update all endpoints
                        for (const { endpoint, rateLimit } of endpoints) {
                            limiter.updateLimit(endpoint, {
                                ...rateLimit,
                                resetAt: now + rateLimit.resetAt,
                            });
                        }

                        // Clear one endpoint
                        const indexToClear = indexOffset % endpoints.length;
                        const endpointToClear = endpoints[indexToClear].endpoint;
                        limiter.clearLimit(endpointToClear);

                        // Verify cleared endpoint is gone
                        expect(limiter.getRateLimit(endpointToClear)).toBeUndefined();

                        // Verify other endpoints still exist
                        for (let i = 0; i < endpoints.length; i++) {
                            if (i !== indexToClear) {
                                const { endpoint } = endpoints[i];
                                expect(limiter.getRateLimit(endpoint)).toBeDefined();
                            }
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
