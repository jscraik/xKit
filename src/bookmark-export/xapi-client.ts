/**
 * X API Client for bookmark export
 * Handles authentication and bookmark retrieval using twitter-api-v2 library
 */

import { TwitterApi, type TwitterApiReadOnly } from 'twitter-api-v2';
import {
  APIError,
  AuthenticationError,
  DEFAULT_RETRY_CONFIG,
  NetworkError,
  retryWithBackoff,
  type RetryConfig,
} from './errors.js';
import { logger } from './logger.js';
import type { BookmarkRecord, Credentials, RateLimitInfo } from './types.js';

/**
 * Authentication token returned after successful authentication
 */
export interface AuthToken {
  client: TwitterApiReadOnly;
  userId: string;
  username: string;
}

/**
 * User information from X API
 */
export interface UserInfo {
  id: string;
  username: string;
  name: string;
}

/**
 * Raw bookmark data from X API
 */
export interface RawBookmark {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  publicMetrics: {
    likeCount: number;
    retweetCount: number;
    replyCount: number;
  };
  entities?: {
    urls?: Array<{ expandedUrl: string }>;
  };
}

/**
 * Paginated response from X API bookmarks endpoint
 */
export interface BookmarkPage {
  bookmarks: BookmarkRecord[];
  nextCursor: string | null;
  rateLimit: RateLimitInfo;
}

/**
 * X API Client for authenticating and retrieving bookmarks
 */
export class XAPIClient {
  private retryConfig: RetryConfig;

  constructor(retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.retryConfig = retryConfig;
  }

  /**
   * Classify error from twitter-api-v2
   */
  private classifyError(error: any, operation: string): Error {
    // Check if it's a twitter-api-v2 error with status code
    if (error?.code || error?.statusCode) {
      const statusCode = error.code || error.statusCode;

      // Authentication errors
      if (statusCode === 401 || statusCode === 403) {
        return new AuthenticationError(
          `Authentication failed: ${error.message || 'Unauthorized'}`,
          operation,
          error
        );
      }

      // API errors with status codes
      return new APIError(
        error.message || `API error: ${statusCode}`,
        operation,
        statusCode,
        error
      );
    }

    // Network errors
    const message = error?.message || String(error);
    const networkErrorPatterns = [
      'network',
      'timeout',
      'econnreset',
      'econnrefused',
      'etimedout',
      'socket hang up',
    ];

    if (networkErrorPatterns.some((pattern) => message.toLowerCase().includes(pattern))) {
      return new NetworkError(message, operation, error);
    }

    // Generic error
    return error instanceof Error ? error : new Error(String(error));
  }

  /**
   * Authenticate with X API using provided credentials
   * @param credentials - API credentials (OAuth 1.0a or OAuth 2.0)
   * @returns Authentication token with client and user info
   * @throws Error if authentication fails
   */
  async authenticate(credentials: Credentials): Promise<AuthToken> {
    const operation = 'authenticate';

    try {
      // Validate credentials format
      if (!credentials.apiKey || !credentials.apiSecret) {
        const error = new Error('API key and secret are required');
        logger.error('Authentication failed: Missing credentials', { operation });
        throw error;
      }

      // Create Twitter API client
      let client: TwitterApiReadOnly;

      if (credentials.accessToken && credentials.accessSecret) {
        // OAuth 1.0a authentication
        const userClient = new TwitterApi({
          appKey: credentials.apiKey,
          appSecret: credentials.apiSecret,
          accessToken: credentials.accessToken,
          accessSecret: credentials.accessSecret,
        });
        client = userClient.readOnly;
      } else {
        // OAuth 2.0 Bearer Token authentication (app-only)
        const appClient = new TwitterApi(credentials.apiKey);
        client = appClient.readOnly;
      }

      // Verify authentication by fetching current user info with retry
      const user = await retryWithBackoff(
        async () => {
          try {
            return await client.v2.me();
          } catch (error) {
            throw this.classifyError(error, operation);
          }
        },
        operation,
        this.retryConfig,
        (attempt: number, error: Error, delayMs: number) => {
          logger.warn(`Authentication attempt ${attempt} failed, retrying in ${delayMs}ms`, {
            operation,
            error: error.message,
          });
        }
      );

      logger.info('Authentication successful', {
        operation,
        userId: user.data.id,
        username: user.data.username,
      });

      return {
        client,
        userId: user.data.id,
        username: user.data.username,
      };
    } catch (error) {
      const classifiedError = this.classifyError(error, operation);
      logger.error(`Authentication failed: ${classifiedError.message}`, {
        operation,
        errorType: classifiedError.name,
      });

      if (classifiedError instanceof Error) {
        throw new Error(`Authentication failed: ${classifiedError.message}`);
      }
      throw new Error('Authentication failed: Unknown error');
    }
  }

  /**
   * Get user information from X API
   * @param token - Authentication token
   * @returns User information
   * @throws Error if request fails
   */
  async getUserInfo(token: AuthToken): Promise<UserInfo> {
    const operation = 'getUserInfo';

    try {
      const user = await retryWithBackoff(
        async () => {
          try {
            return await token.client.v2.me();
          } catch (error) {
            throw this.classifyError(error, operation);
          }
        },
        operation,
        this.retryConfig,
        (attempt: number, error: Error, delayMs: number) => {
          logger.warn(`Get user info attempt ${attempt} failed, retrying in ${delayMs}ms`, {
            operation,
            error: error.message,
          });
        }
      );

      return {
        id: user.data.id,
        username: user.data.username,
        name: user.data.name,
      };
    } catch (error) {
      const classifiedError = this.classifyError(error, operation);
      logger.error(`Failed to get user info: ${classifiedError.message}`, {
        operation,
        errorType: classifiedError.name,
      });

      if (classifiedError instanceof Error) {
        throw new Error(`Failed to get user info: ${classifiedError.message}`);
      }
      throw new Error('Failed to get user info: Unknown error');
    }
  }

  /**
   * Get bookmarks from X API with pagination support
   * @param token - Authentication token
   * @param cursor - Optional pagination cursor
   * @returns Page of bookmarks with next cursor and rate limit info
   * @throws Error if request fails
   */
  async getBookmarks(token: AuthToken, cursor?: string): Promise<BookmarkPage> {
    const operation = 'getBookmarks';

    try {
      // Fetch bookmarks using X API v2 with retry logic
      const response = await retryWithBackoff(
        async () => {
          try {
            return await token.client.v2.bookmarks({
              max_results: 100, // Maximum allowed by API
              pagination_token: cursor,
              expansions: ['author_id'],
              'tweet.fields': ['created_at', 'public_metrics', 'entities', 'text'],
              'user.fields': ['username', 'name'],
            });
          } catch (error) {
            throw this.classifyError(error, operation);
          }
        },
        operation,
        this.retryConfig,
        (attempt: number, error: Error, delayMs: number) => {
          logger.warn(`Get bookmarks attempt ${attempt} failed, retrying in ${delayMs}ms`, {
            operation,
            cursor,
            error: error.message,
          });
        }
      );

      // Extract rate limit information from response
      const rateLimit: RateLimitInfo = {
        limit: response.rateLimit?.limit ?? 0,
        remaining: response.rateLimit?.remaining ?? 0,
        resetAt: response.rateLimit?.reset ?? 0,
      };

      // Transform API response to BookmarkRecord format
      const bookmarks: BookmarkRecord[] = [];
      const users = new Map(response.includes?.users?.map((u) => [u.id, u]) ?? []);

      for (const tweet of response.data?.data ?? []) {
        const author = users.get(tweet.author_id ?? '');
        if (!author) {
          logger.warn('Skipping bookmark with missing author', {
            operation,
            bookmarkId: tweet.id,
            authorId: tweet.author_id,
          });
          continue;
        }

        // Extract URL from entities or construct from tweet ID
        let url = `https://twitter.com/${author.username}/status/${tweet.id}`;
        if (tweet.entities?.urls && tweet.entities.urls.length > 0) {
          // Use the first expanded URL if available
          const firstUrl = tweet.entities.urls[0];
          if (firstUrl.expanded_url) {
            url = firstUrl.expanded_url;
          }
        }

        bookmarks.push({
          id: tweet.id,
          url,
          text: tweet.text,
          authorUsername: author.username,
          authorName: author.name,
          createdAt: tweet.created_at ?? new Date().toISOString(),
          likeCount: tweet.public_metrics?.like_count ?? 0,
          retweetCount: tweet.public_metrics?.retweet_count ?? 0,
          replyCount: tweet.public_metrics?.reply_count ?? 0,
        });
      }

      logger.info(`Successfully fetched ${bookmarks.length} bookmarks`, {
        operation,
        cursor,
        hasNextCursor: !!response.meta?.next_token,
      });

      return {
        bookmarks,
        nextCursor: response.meta?.next_token ?? null,
        rateLimit,
      };
    } catch (error) {
      const classifiedError = this.classifyError(error, operation);
      logger.error(`Failed to get bookmarks: ${classifiedError.message}`, {
        operation,
        cursor,
        errorType: classifiedError.name,
      });

      if (classifiedError instanceof Error) {
        throw new Error(`Failed to get bookmarks: ${classifiedError.message}`);
      }
      throw new Error('Failed to get bookmarks: Unknown error');
    }
  }
}
