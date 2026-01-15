/**
 * Property-based tests for UsefulnessScorer
 * Feature: bookmark-export-analysis
 */

import * as fc from 'fast-check';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScoringConfig } from '../../src/bookmark-analysis/types.js';
import { UsefulnessScorer } from '../../src/bookmark-analysis/usefulness-scorer.js';
import type { BookmarkRecord } from '../../src/bookmark-export/types.js';

// Arbitrary generators for property-based testing

// Generate valid ISO 8601 date-time strings within a reasonable range
const arbitraryISODateTime = (): fc.Arbitrary<string> => {
    // Generate timestamps between 2000-01-01 and 2030-12-31
    const minTimestamp = new Date('2000-01-01').getTime();
    const maxTimestamp = new Date('2030-12-31').getTime();
    return fc.integer({ min: minTimestamp, max: maxTimestamp })
        .map(timestamp => new Date(timestamp).toISOString());
};

const arbitraryBookmarkRecord = (): fc.Arbitrary<BookmarkRecord> => {
    return fc.record({
        id: fc.string({ minLength: 1 }),
        url: fc.webUrl(),
        text: fc.string(),
        authorUsername: fc.string({ minLength: 1 }),
        authorName: fc.string({ minLength: 1 }),
        createdAt: arbitraryISODateTime(),
        likeCount: fc.nat(),
        retweetCount: fc.nat(),
        replyCount: fc.nat(),
    });
};

const arbitraryScoringConfig = (method: 'heuristic' | 'llm' | 'hybrid'): fc.Arbitrary<ScoringConfig> => {
    return fc.record({
        method: fc.constant(method),
        weights: fc.record({
            engagement: fc.double({ min: 0, max: 1, noNaN: true }),
            recency: fc.double({ min: 0, max: 1, noNaN: true }),
            contentQuality: fc.double({ min: 0, max: 1, noNaN: true }),
        }),
        llmConfig: method === 'heuristic' ? fc.constant(undefined) : fc.record({
            provider: fc.constantFrom('openai' as const, 'anthropic' as const),
            model: fc.string({ minLength: 1 }),
            apiKey: fc.string({ minLength: 1 }),
            prompt: fc.string({ minLength: 1 }),
            maxCategories: fc.integer({ min: 1, max: 10 }),
        }),
    });
};

describe('UsefulnessScorer - Property-Based Tests', () => {
    beforeEach(() => {
        // Reset fetch mock before each test
        vi.restoreAllMocks();
    });

    /**
     * Property 12: Usefulness score range
     * For any bookmark evaluated for usefulness, the assigned usefulnessScore should be a number between 0 and 100 inclusive
     * **Validates: Requirements 5.3, 5.4**
     */
    it('Property 12: should assign scores between 0 and 100 for heuristic method', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                arbitraryScoringConfig('heuristic'),
                async (bookmark, config) => {
                    const scorer = new UsefulnessScorer(config);
                    const result = await scorer.analyze(bookmark);

                    // Score should be defined
                    expect(result.usefulnessScore).toBeDefined();

                    // Score should be a number
                    expect(typeof result.usefulnessScore).toBe('number');

                    // Score should be between 0 and 100 inclusive
                    expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(result.usefulnessScore).toBeLessThanOrEqual(100);

                    // Score should not be NaN
                    expect(Number.isNaN(result.usefulnessScore)).toBe(false);

                    // Score should be an integer (rounded)
                    expect(Number.isInteger(result.usefulnessScore)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 12 (LLM method): Usefulness score range for LLM-based scoring
     * For any bookmark evaluated with LLM scoring, the assigned usefulnessScore should be between 0 and 100
     * **Validates: Requirements 5.3, 5.4**
     */
    it('Property 12 (LLM): should assign scores between 0 and 100 for LLM method', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                arbitraryScoringConfig('llm'),
                fc.integer({ min: 0, max: 100 }), // Mock LLM score
                async (bookmark, config, mockScore) => {
                    // Mock LLM response
                    global.fetch = vi.fn().mockResolvedValue({
                        ok: true,
                        json: async () => ({
                            choices: [
                                {
                                    message: {
                                        content: mockScore.toString(),
                                    },
                                },
                            ],
                        }),
                    });

                    const scorer = new UsefulnessScorer(config);
                    const result = await scorer.analyze(bookmark);

                    // Score should be defined
                    expect(result.usefulnessScore).toBeDefined();

                    // Score should be a number
                    expect(typeof result.usefulnessScore).toBe('number');

                    // Score should be between 0 and 100 inclusive
                    expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(result.usefulnessScore).toBeLessThanOrEqual(100);

                    // Score should not be NaN
                    expect(Number.isNaN(result.usefulnessScore)).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 12 (hybrid method): Usefulness score range for hybrid scoring
     * For any bookmark evaluated with hybrid scoring, the assigned usefulnessScore should be between 0 and 100
     * **Validates: Requirements 5.3, 5.4**
     */
    it('Property 12 (hybrid): should assign scores between 0 and 100 for hybrid method', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                arbitraryScoringConfig('hybrid'),
                fc.integer({ min: 0, max: 100 }), // Mock LLM score
                async (bookmark, config, mockScore) => {
                    // Mock LLM response
                    global.fetch = vi.fn().mockResolvedValue({
                        ok: true,
                        json: async () => ({
                            choices: [
                                {
                                    message: {
                                        content: mockScore.toString(),
                                    },
                                },
                            ],
                        }),
                    });

                    const scorer = new UsefulnessScorer(config);
                    const result = await scorer.analyze(bookmark);

                    // Score should be defined
                    expect(result.usefulnessScore).toBeDefined();

                    // Score should be a number
                    expect(typeof result.usefulnessScore).toBe('number');

                    // Score should be between 0 and 100 inclusive
                    expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(result.usefulnessScore).toBeLessThanOrEqual(100);

                    // Score should not be NaN
                    expect(Number.isNaN(result.usefulnessScore)).toBe(false);

                    // Score should be an integer (rounded)
                    expect(Number.isInteger(result.usefulnessScore)).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 13: Multiple scoring methods
     * For any bookmark, both LLM-based and script-based scoring methods should produce valid usefulness scores in the range [0, 100]
     * **Validates: Requirements 5.5**
     */
    it('Property 13: should produce valid scores for all scoring methods', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                fc.integer({ min: 0, max: 100 }), // Mock LLM score
                async (bookmark, mockScore) => {
                    // Mock LLM response for LLM and hybrid methods
                    global.fetch = vi.fn().mockResolvedValue({
                        ok: true,
                        json: async () => ({
                            choices: [
                                {
                                    message: {
                                        content: mockScore.toString(),
                                    },
                                },
                            ],
                        }),
                    });

                    // Test heuristic method
                    const heuristicConfig: ScoringConfig = {
                        method: 'heuristic',
                        weights: {
                            engagement: 0.4,
                            recency: 0.3,
                            contentQuality: 0.3,
                        },
                    };
                    const heuristicScorer = new UsefulnessScorer(heuristicConfig);
                    const heuristicResult = await heuristicScorer.analyze(bookmark);

                    expect(heuristicResult.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(heuristicResult.usefulnessScore).toBeLessThanOrEqual(100);

                    // Test LLM method
                    const llmConfig: ScoringConfig = {
                        method: 'llm',
                        weights: {
                            engagement: 0.4,
                            recency: 0.3,
                            contentQuality: 0.3,
                        },
                        llmConfig: {
                            provider: 'openai',
                            model: 'gpt-4',
                            apiKey: 'test-key',
                            prompt: 'Score: {text}',
                            maxCategories: 3,
                        },
                    };
                    const llmScorer = new UsefulnessScorer(llmConfig);
                    const llmResult = await llmScorer.analyze(bookmark);

                    expect(llmResult.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(llmResult.usefulnessScore).toBeLessThanOrEqual(100);

                    // Test hybrid method
                    const hybridConfig: ScoringConfig = {
                        method: 'hybrid',
                        weights: {
                            engagement: 0.4,
                            recency: 0.3,
                            contentQuality: 0.3,
                        },
                        llmConfig: {
                            provider: 'openai',
                            model: 'gpt-4',
                            apiKey: 'test-key',
                            prompt: 'Score: {text}',
                            maxCategories: 3,
                        },
                    };
                    const hybridScorer = new UsefulnessScorer(hybridConfig);
                    const hybridResult = await hybridScorer.analyze(bookmark);

                    expect(hybridResult.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(hybridResult.usefulnessScore).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property: Heuristic scoring should be deterministic
     * For any bookmark and config, running heuristic scoring multiple times should produce the same score
     */
    it('should produce consistent scores for heuristic method', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                arbitraryScoringConfig('heuristic'),
                async (bookmark, config) => {
                    const scorer = new UsefulnessScorer(config);

                    // Score the same bookmark multiple times
                    const score1 = await scorer.score(bookmark);
                    const score2 = await scorer.score(bookmark);
                    const score3 = await scorer.score(bookmark);

                    // All scores should be identical
                    expect(score1).toBe(score2);
                    expect(score2).toBe(score3);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: Engagement should positively correlate with score
     * For any bookmark, increasing engagement metrics should not decrease the heuristic score
     */
    it('should assign higher or equal scores for increased engagement', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                fc.nat({ max: 1000 }), // Additional engagement
                async (bookmark, additionalEngagement) => {
                    const config: ScoringConfig = {
                        method: 'heuristic',
                        weights: {
                            engagement: 1.0, // Only engagement matters
                            recency: 0.0,
                            contentQuality: 0.0,
                        },
                    };

                    const scorer = new UsefulnessScorer(config);

                    // Score original bookmark
                    const originalScore = await scorer.score(bookmark);

                    // Score bookmark with increased engagement
                    const increasedEngagementBookmark: BookmarkRecord = {
                        ...bookmark,
                        likeCount: bookmark.likeCount + additionalEngagement,
                        retweetCount: bookmark.retweetCount + additionalEngagement,
                        replyCount: bookmark.replyCount + additionalEngagement,
                    };
                    const increasedScore = await scorer.score(increasedEngagementBookmark);

                    // Increased engagement should result in higher or equal score
                    expect(increasedScore).toBeGreaterThanOrEqual(originalScore);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: Recency should positively correlate with score
     * For any bookmark, a more recent timestamp should result in a higher or equal score
     */
    it('should assign higher or equal scores for more recent bookmarks', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                async (bookmark) => {
                    const config: ScoringConfig = {
                        method: 'heuristic',
                        weights: {
                            engagement: 0.0,
                            recency: 1.0, // Only recency matters
                            contentQuality: 0.0,
                        },
                    };

                    const scorer = new UsefulnessScorer(config);

                    // Create an older version of the bookmark
                    const olderTimestamp = new Date(new Date(bookmark.createdAt).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
                    const olderBookmark: BookmarkRecord = {
                        ...bookmark,
                        createdAt: olderTimestamp,
                    };

                    // Score both bookmarks
                    const recentScore = await scorer.score(bookmark);
                    const olderScore = await scorer.score(olderBookmark);

                    // More recent bookmark should have higher or equal score
                    expect(recentScore).toBeGreaterThanOrEqual(olderScore);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: LLM failure should fallback to heuristic
     * For any bookmark, if LLM fails, the score should still be valid (using heuristic fallback)
     */
    it('should fallback to heuristic scoring when LLM fails', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                arbitraryScoringConfig('llm'),
                async (bookmark, config) => {
                    // Mock LLM failure
                    global.fetch = vi.fn().mockRejectedValue(new Error('LLM failed'));

                    // Suppress console.error for this test
                    const originalError = console.error;
                    console.error = () => { };

                    const scorer = new UsefulnessScorer(config);
                    const result = await scorer.analyze(bookmark);

                    // Restore console.error
                    console.error = originalError;

                    // Should still return a valid score (using heuristic fallback)
                    expect(result.usefulnessScore).toBeDefined();
                    expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(result.usefulnessScore).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: Hybrid scoring should be between heuristic and LLM scores
     * For any bookmark, the hybrid score should be the average of heuristic and LLM scores
     */
    it('should average heuristic and LLM scores in hybrid mode', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                fc.integer({ min: 0, max: 100 }), // Mock LLM score
                async (bookmark, mockLLMScore) => {
                    // Mock LLM response
                    global.fetch = vi.fn().mockResolvedValue({
                        ok: true,
                        json: async () => ({
                            choices: [
                                {
                                    message: {
                                        content: mockLLMScore.toString(),
                                    },
                                },
                            ],
                        }),
                    });

                    const config: ScoringConfig = {
                        method: 'hybrid',
                        weights: {
                            engagement: 0.4,
                            recency: 0.3,
                            contentQuality: 0.3,
                        },
                        llmConfig: {
                            provider: 'openai',
                            model: 'gpt-4',
                            apiKey: 'test-key',
                            prompt: 'Score: {text}',
                            maxCategories: 3,
                        },
                    };

                    // Get heuristic score
                    const heuristicConfig: ScoringConfig = {
                        method: 'heuristic',
                        weights: config.weights,
                    };
                    const heuristicScorer = new UsefulnessScorer(heuristicConfig);
                    const heuristicScore = await heuristicScorer.score(bookmark);

                    // Get hybrid score
                    const hybridScorer = new UsefulnessScorer(config);
                    const hybridScore = await hybridScorer.score(bookmark);

                    // Hybrid should be the average (rounded)
                    const expectedHybrid = Math.round((heuristicScore + mockLLMScore) / 2);
                    expect(hybridScore).toBe(expectedHybrid);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: Score should handle edge cases
     * For any bookmark with extreme values (zero engagement, very old, empty text), score should still be valid
     */
    it('should handle edge cases without errors', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.record({
                    id: fc.string({ minLength: 1 }),
                    url: fc.webUrl(),
                    text: fc.constantFrom('', 'a', 'x'.repeat(280)), // Empty, minimal, or max length
                    authorUsername: fc.string({ minLength: 1 }),
                    authorName: fc.string({ minLength: 1 }),
                    createdAt: fc.constantFrom(
                        new Date('2000-01-01').toISOString(), // Very old
                        new Date().toISOString(), // Current
                        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Future
                    ),
                    likeCount: fc.constantFrom(0, 1, 1000000), // Zero, minimal, or very high
                    retweetCount: fc.constantFrom(0, 1, 1000000),
                    replyCount: fc.constantFrom(0, 1, 1000000),
                }),
                arbitraryScoringConfig('heuristic'),
                async (bookmark, config) => {
                    const scorer = new UsefulnessScorer(config);
                    const result = await scorer.analyze(bookmark);

                    // Should still return a valid score
                    expect(result.usefulnessScore).toBeDefined();
                    expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
                    expect(result.usefulnessScore).toBeLessThanOrEqual(100);
                    expect(Number.isNaN(result.usefulnessScore)).toBe(false);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property: analyze() should only return usefulnessScore
     * For any bookmark, the analyze method should return an AnalysisResult with only usefulnessScore
     */
    it('should return only usefulnessScore in AnalysisResult', async () => {
        await fc.assert(
            fc.asyncProperty(
                arbitraryBookmarkRecord(),
                arbitraryScoringConfig('heuristic'),
                async (bookmark, config) => {
                    const scorer = new UsefulnessScorer(config);
                    const result = await scorer.analyze(bookmark);

                    // Should have usefulnessScore
                    expect(result.usefulnessScore).toBeDefined();

                    // Should not have categories or customFields
                    expect(result.categories).toBeUndefined();
                    expect(result.customFields).toBeUndefined();
                }
            ),
            { numRuns: 50 }
        );
    });
});
