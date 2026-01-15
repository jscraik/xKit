/**
 * Unit tests for LLMCategorizer
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMCategorizer } from '../../src/bookmark-analysis/llm-categorizer.js';
import type { LLMConfig } from '../../src/bookmark-analysis/types.js';
import type { BookmarkRecord } from '../../src/bookmark-export/types.js';

describe('LLMCategorizer', () => {
  const sampleBookmark: BookmarkRecord = {
    id: '1',
    url: 'https://twitter.com/user/status/1',
    text: 'This is a tweet about machine learning and artificial intelligence',
    authorUsername: 'author',
    authorName: 'Author Name',
    createdAt: '2024-01-01T00:00:00.000Z',
    likeCount: 10,
    retweetCount: 5,
    replyCount: 2,
  };

  const mockConfig: LLMConfig = {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'test-api-key',
    prompt: 'Categorize this: {text}',
    maxCategories: 3,
  };

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.restoreAllMocks();
  });

  describe('analyze', () => {
    it('should categorize bookmark with valid text', async () => {
      // Mock successful OpenAI response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'machine learning, artificial intelligence, technology',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const result = await categorizer.analyze(sampleBookmark);

      expect(result.categories).toBeDefined();
      expect(result.categories).toHaveLength(3);
      expect(result.categories).toContain('machine learning');
      expect(result.categories).toContain('artificial intelligence');
      expect(result.categories).toContain('technology');
    });

    it('should return "uncategorized" for bookmark with empty text', async () => {
      const emptyBookmark: BookmarkRecord = {
        ...sampleBookmark,
        text: '',
      };

      const categorizer = new LLMCategorizer(mockConfig);
      const result = await categorizer.analyze(emptyBookmark);

      expect(result.categories).toEqual(['uncategorized']);
    });

    it('should handle LLM failure with "uncategorized" fallback', async () => {
      // Mock failed API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const categorizer = new LLMCategorizer(mockConfig);
      const result = await categorizer.analyze(sampleBookmark);

      expect(result.categories).toEqual(['uncategorized']);
      expect(consoleSpy).toHaveBeenCalledWith('LLM categorization failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle network errors with "uncategorized" fallback', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const categorizer = new LLMCategorizer(mockConfig);
      const result = await categorizer.analyze(sampleBookmark);

      expect(result.categories).toEqual(['uncategorized']);
      expect(consoleSpy).toHaveBeenCalledWith('LLM categorization failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle LLM timeout with "uncategorized" fallback', async () => {
      // **Validates: Requirements 4.5**
      // Test that when LLM times out, bookmark is marked with "uncategorized" label

      // Mock timeout error - simulate a request that never completes
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'));
          }, 100);
        });
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const categorizer = new LLMCategorizer(mockConfig);
      const result = await categorizer.analyze(sampleBookmark);

      expect(result.categories).toEqual(['uncategorized']);
      expect(consoleSpy).toHaveBeenCalledWith('LLM categorization failed:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('categorize', () => {
    it('should send correct prompt to OpenAI', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'tech, programming',
              },
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      const categorizer = new LLMCategorizer(mockConfig);
      await categorizer.categorize('test text');

      expect(fetchMock).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
          body: expect.stringContaining('test text'),
        }),
      );
    });

    it('should limit categories to maxCategories', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'cat1, cat2, cat3, cat4, cat5',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toHaveLength(3); // maxCategories is 3
    });

    it('should parse comma-separated categories', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'technology, programming, javascript',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['technology', 'programming', 'javascript']);
    });

    it('should parse JSON array categories', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '["technology", "programming", "javascript"]',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['technology', 'programming', 'javascript']);
    });

    it('should handle categories with "Categories:" prefix', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Categories: technology, programming',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['technology', 'programming']);
    });

    it('should normalize categories to lowercase', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Technology, Programming, JavaScript',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['technology', 'programming', 'javascript']);
    });

    it('should filter out empty categories', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'technology, , programming, ,',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['technology', 'programming']);
    });

    it('should return "uncategorized" for empty LLM response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
              },
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['uncategorized']);
    });
  });

  describe('Anthropic provider', () => {
    it('should send correct request to Anthropic API', async () => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        apiKey: 'test-anthropic-key',
        prompt: 'Categorize: {text}',
        maxCategories: 3,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: 'technology, ai',
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      const categorizer = new LLMCategorizer(anthropicConfig);
      await categorizer.categorize('test text');

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
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        apiKey: 'test-anthropic-key',
        prompt: 'Categorize: {text}',
        maxCategories: 3,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: 'technology, programming, ai',
            },
          ],
        }),
      });

      const categorizer = new LLMCategorizer(anthropicConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['technology', 'programming', 'ai']);
    });

    it('should handle Anthropic API errors', async () => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        apiKey: 'test-anthropic-key',
        prompt: 'Categorize: {text}',
        maxCategories: 3,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const categorizer = new LLMCategorizer(anthropicConfig);
      const categories = await categorizer.categorize('test text');

      expect(categories).toEqual(['uncategorized']);
      consoleSpy.mockRestore();
    });
  });

  describe('configure', () => {
    it('should update configuration', async () => {
      const categorizer = new LLMCategorizer(mockConfig);

      const newConfig: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        apiKey: 'new-api-key',
        prompt: 'New prompt: {text}',
        maxCategories: 5,
      };

      categorizer.configure(newConfig);

      // Verify new config is used by checking API call
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [
            {
              text: 'test',
            },
          ],
        }),
      });
      global.fetch = fetchMock;

      await categorizer.categorize('test');

      expect(fetchMock).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', expect.anything());
    });
  });

  describe('error handling', () => {
    it('should throw error for missing API key', async () => {
      const invalidConfig: LLMConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: '',
        prompt: 'Test',
        maxCategories: 3,
      };

      const categorizer = new LLMCategorizer(invalidConfig);
      const categories = await categorizer.categorize('test');

      // Should fallback to uncategorized on error
      expect(categories).toEqual(['uncategorized']);
    });

    it('should throw error for unsupported provider', async () => {
      const invalidConfig = {
        provider: 'custom' as const,
        model: 'test',
        apiKey: 'test-key',
        prompt: 'Test',
        maxCategories: 3,
      };

      const categorizer = new LLMCategorizer(invalidConfig);
      const categories = await categorizer.categorize('test');

      // Should fallback to uncategorized on error
      expect(categories).toEqual(['uncategorized']);
    });

    it('should handle missing choices in OpenAI response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [],
        }),
      });

      const categorizer = new LLMCategorizer(mockConfig);
      const categories = await categorizer.categorize('test');

      expect(categories).toEqual(['uncategorized']);
    });

    it('should handle missing content in Anthropic response', async () => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        model: 'claude-3-haiku-20240307',
        apiKey: 'test-key',
        prompt: 'Test',
        maxCategories: 3,
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [],
        }),
      });

      const categorizer = new LLMCategorizer(anthropicConfig);
      const categories = await categorizer.categorize('test');

      expect(categories).toEqual(['uncategorized']);
    });
  });
});
