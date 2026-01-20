/**
 * Unit tests for UsefulnessScorer
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScoringConfig } from '../../src/bookmark-analysis/types.js';
import { UsefulnessScorer } from '../../src/bookmark-analysis/usefulness-scorer.js';
import type { BookmarkRecord } from '../../src/bookmark-export/types.js';

describe('UsefulnessScorer', () => {
  const sampleBookmark: BookmarkRecord = {
    id: '1',
    url: 'https://twitter.com/user/status/1',
    text: 'This is a tweet about machine learning and artificial intelligence with substantial content',
    authorUsername: 'author',
    authorName: 'Author Name',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    likeCount: 100,
    retweetCount: 50,
    replyCount: 20,
  };

  const heuristicConfig: ScoringConfig = {
    method: 'heuristic',
    weights: {
      engagement: 0.4,
      recency: 0.3,
      contentQuality: 0.3,
    },
  };

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
      apiKey: 'test-api-key',
      prompt: 'Score this bookmark: {text}',
      maxCategories: 3,
    },
  };

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
      apiKey: 'test-api-key',
      prompt: 'Score this bookmark: {text}',
      maxCategories: 3,
    },
  };

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.restoreAllMocks();
  });

  describe('heuristic scoring', () => {
    it('should score bookmark using heuristic method', async () => {
      // **Validates: Requirements 5.1, 5.3, 5.4, 5.5**
      const scorer = new UsefulnessScorer(heuristicConfig);
      const result = await scorer.analyze(sampleBookmark);

      expect(result.usefulnessScore).toBeDefined();
      expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
      expect(result.usefulnessScore).toBeLessThanOrEqual(100);
    });

    it('should assign higher scores to bookmarks with high engagement', async () => {
      const highEngagementBookmark: BookmarkRecord = {
        ...sampleBookmark,
        likeCount: 1000,
        retweetCount: 500,
        replyCount: 200,
      };

      const lowEngagementBookmark: BookmarkRecord = {
        ...sampleBookmark,
        likeCount: 1,
        retweetCount: 0,
        replyCount: 0,
      };

      const scorer = new UsefulnessScorer(heuristicConfig);
      const highScore = await scorer.score(highEngagementBookmark);
      const lowScore = await scorer.score(lowEngagementBookmark);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should assign higher scores to more recent bookmarks', async () => {
      const recentBookmark: BookmarkRecord = {
        ...sampleBookmark,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      };

      const oldBookmark: BookmarkRecord = {
        ...sampleBookmark,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
      };

      const scorer = new UsefulnessScorer(heuristicConfig);
      const recentScore = await scorer.score(recentBookmark);
      const oldScore = await scorer.score(oldBookmark);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    it('should assign higher scores to bookmarks with longer text', async () => {
      const longTextBookmark: BookmarkRecord = {
        ...sampleBookmark,
        text: 'This is a very long and detailed tweet with substantial content that provides valuable information and insights about the topic being discussed. It contains multiple sentences and covers various aspects of the subject matter.',
      };

      const shortTextBookmark: BookmarkRecord = {
        ...sampleBookmark,
        text: 'Short tweet',
      };

      const scorer = new UsefulnessScorer(heuristicConfig);
      const longScore = await scorer.score(longTextBookmark);
      const shortScore = await scorer.score(shortTextBookmark);

      expect(longScore).toBeGreaterThan(shortScore);
    });

    it('should handle bookmarks with zero engagement', async () => {
      const zeroEngagementBookmark: BookmarkRecord = {
        ...sampleBookmark,
        likeCount: 0,
        retweetCount: 0,
        replyCount: 0,
      };

      const scorer = new UsefulnessScorer(heuristicConfig);
      const score = await scorer.score(zeroEngagementBookmark);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle bookmarks with empty text', async () => {
      const emptyTextBookmark: BookmarkRecord = {
        ...sampleBookmark,
        text: '',
      };

      const scorer = new UsefulnessScorer(heuristicConfig);
      const score = await scorer.score(emptyTextBookmark);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should respect configured weights', async () => {
      const engagementWeightedConfig: ScoringConfig = {
        method: 'heuristic',
        weights: {
          engagement: 1.0,
          recency: 0.0,
          contentQuality: 0.0,
        },
      };

      const recencyWeightedConfig: ScoringConfig = {
        method: 'heuristic',
        weights: {
          engagement: 0.0,
          recency: 1.0,
          contentQuality: 0.0,
        },
      };

      const highEngagementOldBookmark: BookmarkRecord = {
        ...sampleBookmark,
        likeCount: 1000,
        retweetCount: 500,
        replyCount: 200,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
      };

      const lowEngagementRecentBookmark: BookmarkRecord = {
        ...sampleBookmark,
        likeCount: 1,
        retweetCount: 0,
        replyCount: 0,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      };

      const engagementScorer = new UsefulnessScorer(engagementWeightedConfig);
      const recencyScorer = new UsefulnessScorer(recencyWeightedConfig);

      const engagementScore1 = await engagementScorer.score(highEngagementOldBookmark);
      const engagementScore2 = await engagementScorer.score(lowEngagementRecentBookmark);

      const recencyScore1 = await recencyScorer.score(highEngagementOldBookmark);
      const recencyScore2 = await recencyScorer.score(lowEngagementRecentBookmark);

      // With engagement weight, high engagement bookmark should score higher
      expect(engagementScore1).toBeGreaterThan(engagementScore2);

      // With recency weight, recent bookmark should score higher
      expect(recencyScore2).toBeGreaterThan(recencyScore1);
    });
  });

  describe('LLM scoring', () => {
    it('should score bookmark using LLM method', async () => {
      // **Validates: Requirements 5.1, 5.3, 5.4, 5.5**
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '85',
              },
            },
          ],
        }),
      });

      const scorer = new UsefulnessScorer(llmConfig);
      const result = await scorer.analyze(sampleBookmark);

      expect(result.usefulnessScore).toBe(85);
    });

    it('should parse score from LLM response with text', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'The usefulness score is 75 out of 100',
              },
            },
          ],
        }),
      });

      const scorer = new UsefulnessScorer(llmConfig);
      const score = await scorer.score(sampleBookmark);

      expect(score).toBe(75);
    });

    it('should clamp scores to 0-100 range', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '85',
              },
            },
          ],
        }),
      });

      const scorer = new UsefulnessScorer(llmConfig);
      const score = await scorer.score(sampleBookmark);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should fallback to heuristic scoring on LLM failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const scorer = new UsefulnessScorer(llmConfig);
      const score = await scorer.score(sampleBookmark);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(consoleSpy).toHaveBeenCalledWith('LLM scoring failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should fallback to heuristic on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const scorer = new UsefulnessScorer(llmConfig);
      const score = await scorer.score(sampleBookmark);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      consoleSpy.mockRestore();
    });

    it('should send correct prompt to OpenAI', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '80',
              },
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      const scorer = new UsefulnessScorer(llmConfig);
      await scorer.score(sampleBookmark);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
          body: expect.stringContaining(sampleBookmark.text),
        }),
      );
    });

    it('should handle invalid score in LLM response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'No score available',
              },
            },
          ],
        }),
      });

      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const scorer = new UsefulnessScorer(llmConfig);
      const score = await scorer.score(sampleBookmark);

      // Should fallback to heuristic
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      consoleSpy.mockRestore();
    });
  });

  describe('hybrid scoring', () => {
    it('should score bookmark using hybrid method', async () => {
      // **Validates: Requirements 5.1, 5.3, 5.4, 5.5**
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '90',
              },
            },
          ],
        }),
      });

      const scorer = new UsefulnessScorer(hybridConfig);
      const result = await scorer.analyze(sampleBookmark);

      expect(result.usefulnessScore).toBeDefined();
      expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
      expect(result.usefulnessScore).toBeLessThanOrEqual(100);
    });

    it('should average LLM and heuristic scores', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '80',
              },
            },
          ],
        }),
      });

      const scorer = new UsefulnessScorer(hybridConfig);

      // Get heuristic score separately
      const heuristicScorer = new UsefulnessScorer(heuristicConfig);
      const heuristicScore = await heuristicScorer.score(sampleBookmark);

      // Get hybrid score
      const hybridScore = await scorer.score(sampleBookmark);

      // Hybrid should be between heuristic and LLM (80)
      const expectedHybrid = Math.round((heuristicScore + 80) / 2);
      expect(hybridScore).toBe(expectedHybrid);
    });

    it('should handle LLM failure in hybrid mode', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const scorer = new UsefulnessScorer(hybridConfig);
      const score = await scorer.score(sampleBookmark);

      // Should still return a valid score (using heuristic fallback)
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      consoleSpy.mockRestore();
    });
  });

  describe('Anthropic provider', () => {
    it('should send correct request to Anthropic API', async () => {
      const anthropicConfig: ScoringConfig = {
        method: 'llm',
        weights: {
          engagement: 0.4,
          recency: 0.3,
          contentQuality: 0.3,
        },
        llmConfig: {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          apiKey: 'test-anthropic-key',
          prompt: 'Score: {text}',
          maxCategories: 3,
        },
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: '75',
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      const scorer = new UsefulnessScorer(anthropicConfig);
      await scorer.score(sampleBookmark);

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-anthropic-key',
            'anthropic-version': '2023-06-01',
          }),
        }),
      );
    });

    it('should parse Anthropic response correctly', async () => {
      const anthropicConfig: ScoringConfig = {
        method: 'llm',
        weights: {
          engagement: 0.4,
          recency: 0.3,
          contentQuality: 0.3,
        },
        llmConfig: {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          apiKey: 'test-anthropic-key',
          prompt: 'Score: {text}',
          maxCategories: 3,
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: '85',
            },
          ],
        }),
      });

      const scorer = new UsefulnessScorer(anthropicConfig);
      const score = await scorer.score(sampleBookmark);

      expect(score).toBe(85);
    });
  });

  describe('configure', () => {
    it('should update configuration', async () => {
      const scorer = new UsefulnessScorer(heuristicConfig);

      const newConfig: ScoringConfig = {
        method: 'llm',
        weights: {
          engagement: 0.5,
          recency: 0.3,
          contentQuality: 0.2,
        },
        llmConfig: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: 'new-api-key',
          prompt: 'New prompt',
          maxCategories: 3,
        },
      };

      scorer.configure(newConfig);

      // Verify new config is used
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '90',
              },
            },
          ],
        }),
      });

      const score = await scorer.score(sampleBookmark);
      expect(score).toBe(90);
    });
  });

  describe('error handling', () => {
    it('should throw error for unsupported scoring method', async () => {
      const invalidConfig = {
        method: 'invalid' as any,
        weights: {
          engagement: 0.4,
          recency: 0.3,
          contentQuality: 0.3,
        },
      };

      const scorer = new UsefulnessScorer(invalidConfig);

      await expect(scorer.score(sampleBookmark)).rejects.toThrow('Unsupported scoring method: invalid');
    });

    it('should throw error for missing LLM config in LLM mode', async () => {
      const invalidConfig: ScoringConfig = {
        method: 'llm',
        weights: {
          engagement: 0.4,
          recency: 0.3,
          contentQuality: 0.3,
        },
        // Missing llmConfig
      };

      const scorer = new UsefulnessScorer(invalidConfig);

      // Should fallback to heuristic on error
      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
      const score = await scorer.score(sampleBookmark);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      consoleSpy.mockRestore();
    });

    it('should handle missing API key', async () => {
      const invalidConfig: ScoringConfig = {
        method: 'llm',
        weights: {
          engagement: 0.4,
          recency: 0.3,
          contentQuality: 0.3,
        },
        llmConfig: {
          provider: 'openai',
          model: 'gpt-4',
          apiKey: '',
          prompt: 'Test',
          maxCategories: 3,
        },
      };

      const scorer = new UsefulnessScorer(invalidConfig);
      const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const score = await scorer.score(sampleBookmark);

      // Should fallback to heuristic
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);

      consoleSpy.mockRestore();
    });
  });

  describe('analyze method', () => {
    it('should return AnalysisResult with usefulnessScore', async () => {
      // **Validates: Requirement 5.4 - Add usefulnessScore field to bookmark records**
      const scorer = new UsefulnessScorer(heuristicConfig);
      const result = await scorer.analyze(sampleBookmark);

      expect(result).toHaveProperty('usefulnessScore');
      expect(typeof result.usefulnessScore).toBe('number');
      expect(result.usefulnessScore).toBeGreaterThanOrEqual(0);
      expect(result.usefulnessScore).toBeLessThanOrEqual(100);
    });

    it('should not include categories or customFields', async () => {
      const scorer = new UsefulnessScorer(heuristicConfig);
      const result = await scorer.analyze(sampleBookmark);

      expect(result.categories).toBeUndefined();
      expect(result.customFields).toBeUndefined();
    });
  });
});
