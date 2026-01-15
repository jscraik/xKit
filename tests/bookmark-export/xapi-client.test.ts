/**
 * Unit tests for XAPIClient authentication methods
 * Tests Requirements 1.1, 1.6
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Credentials } from '../../src/bookmark-export/types.js';
import { XAPIClient } from '../../src/bookmark-export/xapi-client.js';

// Create mock functions that will be shared across tests
const mockMe = vi.fn();
const mockBookmarks = vi.fn();

// Mock twitter-api-v2
vi.mock('twitter-api-v2', () => {
  return {
    TwitterApi: class MockTwitterApi {
      readOnly: any;

      constructor(config: any) {
        this.readOnly = {
          v2: {
            me: mockMe,
            bookmarks: mockBookmarks,
          },
        };
      }
    },
  };
});

describe('XAPIClient Authentication', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('authenticate()', () => {
    it('should successfully authenticate with valid OAuth 1.0a credentials', async () => {
      // Arrange
      const client = new XAPIClient();
      const credentials: Credentials = {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        accessToken: 'test-access-token',
        accessSecret: 'test-access-secret',
      };

      // Mock successful authentication
      mockMe.mockResolvedValue({
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User',
        },
      });

      // Act
      const token = await client.authenticate(credentials);

      // Assert
      expect(token).toBeDefined();
      expect(token.userId).toBe('123456789');
      expect(token.username).toBe('testuser');
      expect(token.client).toBeDefined();
      expect(mockMe).toHaveBeenCalled();
    });

    it('should successfully authenticate with valid OAuth 2.0 credentials', async () => {
      // Arrange
      const client = new XAPIClient();
      const credentials: Credentials = {
        apiKey: 'test-bearer-token',
        apiSecret: 'test-api-secret',
      };

      // Mock successful authentication
      mockMe.mockResolvedValue({
        data: {
          id: '987654321',
          username: 'appuser',
          name: 'App User',
        },
      });

      // Act
      const token = await client.authenticate(credentials);

      // Assert
      expect(token).toBeDefined();
      expect(token.userId).toBe('987654321');
      expect(token.username).toBe('appuser');
      expect(token.client).toBeDefined();
      expect(mockMe).toHaveBeenCalled();
    });

    it('should throw error when API key is missing', async () => {
      // Arrange
      const client = new XAPIClient();
      const credentials: Credentials = {
        apiKey: '',
        apiSecret: 'test-api-secret',
      };

      // Act & Assert
      await expect(client.authenticate(credentials)).rejects.toThrow('API key and secret are required');
    });

    it('should throw error when API secret is missing', async () => {
      // Arrange
      const client = new XAPIClient();
      const credentials: Credentials = {
        apiKey: 'test-api-key',
        apiSecret: '',
      };

      // Act & Assert
      await expect(client.authenticate(credentials)).rejects.toThrow('API key and secret are required');
    });

    it('should throw descriptive error when authentication fails', async () => {
      // Arrange
      const client = new XAPIClient();
      const credentials: Credentials = {
        apiKey: 'invalid-key',
        apiSecret: 'invalid-secret',
        accessToken: 'invalid-token',
        accessSecret: 'invalid-secret',
      };

      // Mock authentication failure
      mockMe.mockRejectedValue(new Error('Invalid credentials'));

      // Act & Assert
      await expect(client.authenticate(credentials)).rejects.toThrow(/Authentication failed/);
    });

    it('should handle network errors during authentication', async () => {
      // Arrange
      const client = new XAPIClient({
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      });
      const credentials: Credentials = {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        accessToken: 'test-access-token',
        accessSecret: 'test-access-secret',
      };

      // Mock network error
      mockMe.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(client.authenticate(credentials)).rejects.toThrow('Authentication failed: Network error');
    });
  });

  describe('getUserInfo()', () => {
    it('should successfully retrieve user information', async () => {
      // Arrange
      const client = new XAPIClient();
      mockMe.mockResolvedValue({
        data: {
          id: '123456789',
          username: 'testuser',
          name: 'Test User',
        },
      });

      const mockClient = {
        v2: { me: mockMe },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act
      const userInfo = await client.getUserInfo(token);

      // Assert
      expect(userInfo).toEqual({
        id: '123456789',
        username: 'testuser',
        name: 'Test User',
      });
      expect(mockMe).toHaveBeenCalled();
    });

    it('should throw error when user info request fails', async () => {
      // Arrange
      const client = new XAPIClient();
      const mockMeFail = vi.fn().mockRejectedValue(new Error('API error'));

      const mockClient = {
        v2: { me: mockMeFail },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act & Assert
      await expect(client.getUserInfo(token)).rejects.toThrow('Failed to get user info: API error');
    });
  });

  describe('getBookmarks()', () => {
    it('should successfully fetch bookmarks and transform to BookmarkRecord format', async () => {
      // Arrange
      const client = new XAPIClient();

      mockBookmarks.mockResolvedValue({
        data: {
          data: [
            {
              id: '1234567890',
              text: 'This is a test bookmark',
              author_id: 'author123',
              created_at: '2024-01-15T10:30:00.000Z',
              public_metrics: {
                like_count: 42,
                retweet_count: 10,
                reply_count: 5,
              },
              entities: {
                urls: [{ expanded_url: 'https://example.com/article' }],
              },
            },
          ],
        },
        includes: {
          users: [
            {
              id: 'author123',
              username: 'testauthor',
              name: 'Test Author',
            },
          ],
        },
        meta: {
          next_token: 'next_cursor_token',
        },
        rateLimit: {
          limit: 180,
          remaining: 179,
          reset: 1705320000,
        },
      });

      const mockClient = {
        v2: { bookmarks: mockBookmarks },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act
      const result = await client.getBookmarks(token);

      // Assert
      expect(result.bookmarks).toHaveLength(1);
      expect(result.bookmarks[0]).toEqual({
        id: '1234567890',
        url: 'https://example.com/article',
        text: 'This is a test bookmark',
        authorUsername: 'testauthor',
        authorName: 'Test Author',
        createdAt: '2024-01-15T10:30:00.000Z',
        likeCount: 42,
        retweetCount: 10,
        replyCount: 5,
      });
      expect(result.nextCursor).toBe('next_cursor_token');
      expect(result.rateLimit).toEqual({
        limit: 180,
        remaining: 179,
        resetAt: 1705320000,
      });
    });

    it('should handle pagination with cursor parameter', async () => {
      // Arrange
      const client = new XAPIClient();
      const cursor = 'pagination_cursor_123';

      mockBookmarks.mockResolvedValue({
        data: {
          data: [
            {
              id: '9876543210',
              text: 'Second page bookmark',
              author_id: 'author456',
              created_at: '2024-01-16T12:00:00.000Z',
              public_metrics: {
                like_count: 100,
                retweet_count: 20,
                reply_count: 8,
              },
            },
          ],
        },
        includes: {
          users: [
            {
              id: 'author456',
              username: 'secondauthor',
              name: 'Second Author',
            },
          ],
        },
        meta: {
          next_token: null, // Last page
        },
        rateLimit: {
          limit: 180,
          remaining: 178,
          reset: 1705320000,
        },
      });

      const mockClient = {
        v2: { bookmarks: mockBookmarks },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act
      const result = await client.getBookmarks(token, cursor);

      // Assert
      expect(mockBookmarks).toHaveBeenCalledWith({
        max_results: 100,
        pagination_token: cursor,
        expansions: ['author_id'],
        'tweet.fields': ['created_at', 'public_metrics', 'entities', 'text'],
        'user.fields': ['username', 'name'],
      });
      expect(result.bookmarks).toHaveLength(1);
      expect(result.nextCursor).toBeNull();
    });

    it('should construct tweet URL when no expanded URL is available', async () => {
      // Arrange
      const client = new XAPIClient();

      mockBookmarks.mockResolvedValue({
        data: {
          data: [
            {
              id: '1111111111',
              text: 'Bookmark without URL',
              author_id: 'author789',
              created_at: '2024-01-17T14:00:00.000Z',
              public_metrics: {
                like_count: 5,
                retweet_count: 1,
                reply_count: 0,
              },
              // No entities.urls
            },
          ],
        },
        includes: {
          users: [
            {
              id: 'author789',
              username: 'urllessauthor',
              name: 'URL-less Author',
            },
          ],
        },
        meta: {},
        rateLimit: {
          limit: 180,
          remaining: 177,
          reset: 1705320000,
        },
      });

      const mockClient = {
        v2: { bookmarks: mockBookmarks },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act
      const result = await client.getBookmarks(token);

      // Assert
      expect(result.bookmarks[0].url).toBe('https://twitter.com/urllessauthor/status/1111111111');
    });

    it('should handle missing optional fields with default values', async () => {
      // Arrange
      const client = new XAPIClient();

      mockBookmarks.mockResolvedValue({
        data: {
          data: [
            {
              id: '2222222222',
              text: 'Minimal bookmark',
              author_id: 'author999',
              // Missing created_at and public_metrics
            },
          ],
        },
        includes: {
          users: [
            {
              id: 'author999',
              username: 'minimalauthor',
              name: 'Minimal Author',
            },
          ],
        },
        meta: {},
        rateLimit: {},
      });

      const mockClient = {
        v2: { bookmarks: mockBookmarks },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act
      const result = await client.getBookmarks(token);

      // Assert
      expect(result.bookmarks[0].likeCount).toBe(0);
      expect(result.bookmarks[0].retweetCount).toBe(0);
      expect(result.bookmarks[0].replyCount).toBe(0);
      expect(result.bookmarks[0].createdAt).toBeDefined();
      expect(result.rateLimit).toEqual({
        limit: 0,
        remaining: 0,
        resetAt: 0,
      });
    });

    it('should skip bookmarks with missing author information', async () => {
      // Arrange
      const client = new XAPIClient();

      mockBookmarks.mockResolvedValue({
        data: {
          data: [
            {
              id: '3333333333',
              text: 'Bookmark with author',
              author_id: 'author111',
              created_at: '2024-01-18T10:00:00.000Z',
              public_metrics: {
                like_count: 10,
                retweet_count: 2,
                reply_count: 1,
              },
            },
            {
              id: '4444444444',
              text: 'Bookmark without author',
              author_id: 'missing_author',
              created_at: '2024-01-18T11:00:00.000Z',
              public_metrics: {
                like_count: 5,
                retweet_count: 1,
                reply_count: 0,
              },
            },
          ],
        },
        includes: {
          users: [
            {
              id: 'author111',
              username: 'validauthor',
              name: 'Valid Author',
            },
            // missing_author is not in the users array
          ],
        },
        meta: {},
        rateLimit: {
          limit: 180,
          remaining: 176,
          reset: 1705320000,
        },
      });

      const mockClient = {
        v2: { bookmarks: mockBookmarks },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act
      const result = await client.getBookmarks(token);

      // Assert
      expect(result.bookmarks).toHaveLength(1);
      expect(result.bookmarks[0].id).toBe('3333333333');
      expect(result.bookmarks[0].authorUsername).toBe('validauthor');
    });

    it('should handle empty bookmark response', async () => {
      // Arrange
      const client = new XAPIClient();

      mockBookmarks.mockResolvedValue({
        data: {
          data: [],
        },
        includes: {
          users: [],
        },
        meta: {},
        rateLimit: {
          limit: 180,
          remaining: 175,
          reset: 1705320000,
        },
      });

      const mockClient = {
        v2: { bookmarks: mockBookmarks },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act
      const result = await client.getBookmarks(token);

      // Assert
      expect(result.bookmarks).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it('should throw error when bookmark request fails', async () => {
      // Arrange
      const client = new XAPIClient();
      const mockBookmarksFail = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));

      const mockClient = {
        v2: { bookmarks: mockBookmarksFail },
      };

      const token = {
        client: mockClient as any,
        userId: '123456789',
        username: 'testuser',
      };

      // Act & Assert
      await expect(client.getBookmarks(token)).rejects.toThrow('Failed to get bookmarks: API rate limit exceeded');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 1: Bookmark completeness
     * **Validates: Requirements 1.3, 3.2**
     *
     * For any bookmark retrieved from the X API, the exported BookmarkRecord
     * should contain all required fields: id, url, text, authorUsername,
     * authorName, createdAt, likeCount, retweetCount, and replyCount
     */
    it('Property 1: All bookmarks should contain all required fields', async () => {
      const fc = await import('fast-check');

      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary author data first
          fc.record({
            id: fc.string({ minLength: 1 }),
            username: fc.string({ minLength: 1 }),
            name: fc.string({ minLength: 1 }),
          }),
          // Generate arbitrary bookmark data from X API that references the author
          fc.record({
            id: fc.string({ minLength: 1 }),
            text: fc.string(),
            created_at: fc.date().map((d) => d.toISOString()),
            public_metrics: fc.record({
              like_count: fc.nat(),
              retweet_count: fc.nat(),
              reply_count: fc.nat(),
            }),
            entities: fc.option(
              fc.record({
                urls: fc.array(
                  fc.record({
                    expanded_url: fc.webUrl(),
                  }),
                  { minLength: 1, maxLength: 3 },
                ),
              }),
              { nil: undefined },
            ),
          }),
          async (author, tweetData) => {
            // Create tweet with matching author_id
            const tweet = {
              ...tweetData,
              author_id: author.id,
            };

            // Arrange: Mock the API response with generated data
            mockBookmarks.mockResolvedValue({
              data: {
                data: [tweet],
              },
              includes: {
                users: [author],
              },
              meta: {},
              rateLimit: {
                limit: 180,
                remaining: 179,
                reset: 1705320000,
              },
            });

            const mockClient = {
              v2: { bookmarks: mockBookmarks },
            };

            const token = {
              client: mockClient as any,
              userId: '123456789',
              username: 'testuser',
            };

            // Act: Fetch bookmarks
            const client = new XAPIClient();
            const result = await client.getBookmarks(token);

            // Assert: Verify all required fields are present
            expect(result.bookmarks).toHaveLength(1);
            const bookmark = result.bookmarks[0];

            // Check that all required fields exist
            expect(bookmark).toHaveProperty('id');
            expect(bookmark).toHaveProperty('url');
            expect(bookmark).toHaveProperty('text');
            expect(bookmark).toHaveProperty('authorUsername');
            expect(bookmark).toHaveProperty('authorName');
            expect(bookmark).toHaveProperty('createdAt');
            expect(bookmark).toHaveProperty('likeCount');
            expect(bookmark).toHaveProperty('retweetCount');
            expect(bookmark).toHaveProperty('replyCount');

            // Check that all required fields have the correct types
            expect(typeof bookmark.id).toBe('string');
            expect(typeof bookmark.url).toBe('string');
            expect(typeof bookmark.text).toBe('string');
            expect(typeof bookmark.authorUsername).toBe('string');
            expect(typeof bookmark.authorName).toBe('string');
            expect(typeof bookmark.createdAt).toBe('string');
            expect(typeof bookmark.likeCount).toBe('number');
            expect(typeof bookmark.retweetCount).toBe('number');
            expect(typeof bookmark.replyCount).toBe('number');

            // Check that string fields are not empty
            expect(bookmark.id.length).toBeGreaterThan(0);
            expect(bookmark.url.length).toBeGreaterThan(0);
            expect(bookmark.authorUsername.length).toBeGreaterThan(0);
            expect(bookmark.authorName.length).toBeGreaterThan(0);
            expect(bookmark.createdAt.length).toBeGreaterThan(0);

            // Check that numeric fields are non-negative
            expect(bookmark.likeCount).toBeGreaterThanOrEqual(0);
            expect(bookmark.retweetCount).toBeGreaterThanOrEqual(0);
            expect(bookmark.replyCount).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
