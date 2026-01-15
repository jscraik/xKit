/**
 * Unit tests for error handling in XAPIClient
 * Tests Requirements 8.1 - Error handling for API failures
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    APIError,
    calculateBackoffDelay,
    isRetryableError,
    NetworkError
} from '../../src/bookmark-export/errors.js';
import { logger } from '../../src/bookmark-export/logger.js';
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

describe('Error Handling', () => {
    beforeEach(() => {
        // Reset mocks before each test
        vi.clearAllMocks();
        logger.clear();
    });

    describe('Network Error Handling', () => {
        it('should retry on network errors and eventually succeed', async () => {
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

            // Mock network error on first two attempts, then success
            mockMe
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('ETIMEDOUT'))
                .mockResolvedValueOnce({
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
            expect(mockMe).toHaveBeenCalledTimes(3);

            // Check that warnings were logged for retries
            const logs = logger.getEntries();
            const warnings = logs.filter((log) => log.level === 'warn');
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0].message).toContain('retrying');
        });

        it('should fail after max retries on persistent network errors', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 2,
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

            // Mock persistent network error
            mockMe.mockRejectedValue(new Error('Network error'));

            // Act & Assert
            await expect(client.authenticate(credentials)).rejects.toThrow(/Authentication failed/);
            expect(mockMe).toHaveBeenCalledTimes(3); // Initial + 2 retries

            // Check that error was logged
            const logs = logger.getEntries();
            const errors = logs.filter((log) => log.level === 'error');
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[errors.length - 1].message).toContain('Authentication failed');
        });

        it('should handle ECONNRESET errors with retry', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 2,
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

            // Mock ECONNRESET error then success
            mockMe
                .mockRejectedValueOnce(new Error('socket hang up'))
                .mockResolvedValueOnce({
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
            expect(mockMe).toHaveBeenCalledTimes(2);
        });
    });

    describe('API Error Handling', () => {
        it('should handle 404 errors gracefully without retry', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 2,
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2,
            });

            const mockClient = {
                v2: { bookmarks: mockBookmarks },
            };

            const token = {
                client: mockClient as any,
                userId: '123456789',
                username: 'testuser',
            };

            // Mock 404 error
            const error404 = new Error('Not found');
            (error404 as any).code = 404;
            mockBookmarks.mockRejectedValue(error404);

            // Act & Assert
            await expect(client.getBookmarks(token)).rejects.toThrow(/Failed to get bookmarks/);
            // Should not retry on 404
            expect(mockBookmarks).toHaveBeenCalledTimes(1);

            // Check that error was logged
            const logs = logger.getEntries();
            const errors = logs.filter((log) => log.level === 'error');
            expect(errors.length).toBeGreaterThan(0);
            expect(errors[0].context?.operation).toBe('getBookmarks');
        });

        it('should retry on 500 errors and eventually succeed', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 2,
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2,
            });

            const mockClient = {
                v2: { bookmarks: mockBookmarks },
            };

            const token = {
                client: mockClient as any,
                userId: '123456789',
                username: 'testuser',
            };

            // Mock 500 error then success
            const error500 = new Error('Internal server error');
            (error500 as any).code = 500;

            mockBookmarks
                .mockRejectedValueOnce(error500)
                .mockResolvedValueOnce({
                    data: {
                        data: [
                            {
                                id: '1234567890',
                                text: 'Test bookmark',
                                author_id: 'author123',
                                created_at: '2024-01-15T10:30:00.000Z',
                                public_metrics: {
                                    like_count: 42,
                                    retweet_count: 10,
                                    reply_count: 5,
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
                    meta: {},
                    rateLimit: {
                        limit: 180,
                        remaining: 179,
                        reset: 1705320000,
                    },
                });

            // Act
            const result = await client.getBookmarks(token);

            // Assert
            expect(result.bookmarks).toHaveLength(1);
            expect(mockBookmarks).toHaveBeenCalledTimes(2);

            // Check that warning was logged for retry
            const logs = logger.getEntries();
            const warnings = logs.filter((log) => log.level === 'warn');
            expect(warnings.length).toBeGreaterThan(0);
        });

        it('should fail after max retries on persistent 500 errors', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 2,
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2,
            });

            const mockClient = {
                v2: { bookmarks: mockBookmarks },
            };

            const token = {
                client: mockClient as any,
                userId: '123456789',
                username: 'testuser',
            };

            // Mock persistent 500 error
            const error500 = new Error('Internal server error');
            (error500 as any).code = 500;
            mockBookmarks.mockRejectedValue(error500);

            // Act & Assert
            await expect(client.getBookmarks(token)).rejects.toThrow(/Failed to get bookmarks/);
            expect(mockBookmarks).toHaveBeenCalledTimes(3); // Initial + 2 retries
        });

        it('should handle 503 Service Unavailable with retry', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 2,
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2,
            });

            const mockClient = {
                v2: { bookmarks: mockBookmarks },
            };

            const token = {
                client: mockClient as any,
                userId: '123456789',
                username: 'testuser',
            };

            // Mock 503 error then success
            const error503 = new Error('Service unavailable');
            (error503 as any).code = 503;

            mockBookmarks
                .mockRejectedValueOnce(error503)
                .mockResolvedValueOnce({
                    data: { data: [] },
                    includes: { users: [] },
                    meta: {},
                    rateLimit: { limit: 180, remaining: 179, reset: 1705320000 },
                });

            // Act
            const result = await client.getBookmarks(token);

            // Assert
            expect(result.bookmarks).toHaveLength(0);
            expect(mockBookmarks).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Logging with Context', () => {
        it('should log errors with operation context', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 0,
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

            mockMe.mockRejectedValue(new Error('Test error'));

            // Act
            try {
                await client.authenticate(credentials);
            } catch (error) {
                // Expected to fail
            }

            // Assert
            const logs = logger.getEntries();
            const errors = logs.filter((log) => log.level === 'error');
            expect(errors.length).toBeGreaterThan(0);

            const lastError = errors[errors.length - 1];
            expect(lastError.context).toBeDefined();
            expect(lastError.context?.operation).toBe('authenticate');
            expect(lastError.message).toContain('Authentication failed');
        });

        it('should log errors with bookmark ID when available', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 0,
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2,
            });

            const mockClient = {
                v2: { bookmarks: mockBookmarks },
            };

            const token = {
                client: mockClient as any,
                userId: '123456789',
                username: 'testuser',
            };

            // Mock response with missing author (will trigger warning log)
            mockBookmarks.mockResolvedValue({
                data: {
                    data: [
                        {
                            id: 'bookmark123',
                            text: 'Test bookmark',
                            author_id: 'missing_author',
                            created_at: '2024-01-15T10:30:00.000Z',
                            public_metrics: {
                                like_count: 42,
                                retweet_count: 10,
                                reply_count: 5,
                            },
                        },
                    ],
                },
                includes: {
                    users: [], // No users, so author will be missing
                },
                meta: {},
                rateLimit: {
                    limit: 180,
                    remaining: 179,
                    reset: 1705320000,
                },
            });

            // Act
            await client.getBookmarks(token);

            // Assert
            const logs = logger.getEntries();
            const warnings = logs.filter((log) => log.level === 'warn');
            expect(warnings.length).toBeGreaterThan(0);

            const authorWarning = warnings.find((log) => log.message.includes('missing author'));
            expect(authorWarning).toBeDefined();
            expect(authorWarning?.context?.bookmarkId).toBe('bookmark123');
            expect(authorWarning?.context?.operation).toBe('getBookmarks');
        });

        it('should log errors with cursor context during pagination', async () => {
            // Arrange
            const client = new XAPIClient({
                maxRetries: 0,
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2,
            });

            const mockClient = {
                v2: { bookmarks: mockBookmarks },
            };

            const token = {
                client: mockClient as any,
                userId: '123456789',
                username: 'testuser',
            };

            const cursor = 'test_cursor_123';
            mockBookmarks.mockRejectedValue(new Error('API error'));

            // Act
            try {
                await client.getBookmarks(token, cursor);
            } catch (error) {
                // Expected to fail
            }

            // Assert
            const logs = logger.getEntries();
            const errors = logs.filter((log) => log.level === 'error');
            expect(errors.length).toBeGreaterThan(0);

            const lastError = errors[errors.length - 1];
            expect(lastError.context?.operation).toBe('getBookmarks');
            expect(lastError.context?.cursor).toBe(cursor);
        });
    });

    describe('Error Classification', () => {
        it('should identify retryable errors correctly', () => {
            // Network errors are retryable
            expect(isRetryableError(new NetworkError('Network error', 'test'))).toBe(true);
            expect(isRetryableError(new Error('ETIMEDOUT'))).toBe(true);
            expect(isRetryableError(new Error('ECONNRESET'))).toBe(true);
            expect(isRetryableError(new Error('socket hang up'))).toBe(true);

            // 5xx errors are retryable
            expect(isRetryableError(new APIError('Server error', 'test', 500))).toBe(true);
            expect(isRetryableError(new APIError('Bad gateway', 'test', 502))).toBe(true);
            expect(isRetryableError(new APIError('Service unavailable', 'test', 503))).toBe(true);

            // 4xx errors are not retryable
            expect(isRetryableError(new APIError('Not found', 'test', 404))).toBe(false);
            expect(isRetryableError(new APIError('Unauthorized', 'test', 401))).toBe(false);

            // Generic errors are not retryable
            expect(isRetryableError(new Error('Generic error'))).toBe(false);
        });

        it('should calculate exponential backoff correctly', () => {
            const config = {
                maxRetries: 3,
                initialDelayMs: 1000,
                maxDelayMs: 10000,
                backoffMultiplier: 2,
            };

            // First retry: 1000ms
            expect(calculateBackoffDelay(0, config)).toBe(1000);

            // Second retry: 2000ms
            expect(calculateBackoffDelay(1, config)).toBe(2000);

            // Third retry: 4000ms
            expect(calculateBackoffDelay(2, config)).toBe(4000);

            // Should cap at maxDelayMs
            expect(calculateBackoffDelay(10, config)).toBe(10000);
        });
    });

    describe('Success Logging', () => {
        it('should log successful operations', async () => {
            // Arrange
            const client = new XAPIClient();
            const credentials: Credentials = {
                apiKey: 'test-api-key',
                apiSecret: 'test-api-secret',
                accessToken: 'test-access-token',
                accessSecret: 'test-access-secret',
            };

            mockMe.mockResolvedValue({
                data: {
                    id: '123456789',
                    username: 'testuser',
                    name: 'Test User',
                },
            });

            // Act
            await client.authenticate(credentials);

            // Assert
            const logs = logger.getEntries();
            const infoLogs = logs.filter((log) => log.level === 'info');
            expect(infoLogs.length).toBeGreaterThan(0);

            const successLog = infoLogs.find((log) => log.message.includes('successful'));
            expect(successLog).toBeDefined();
            expect(successLog?.context?.operation).toBe('authenticate');
            expect(successLog?.context?.userId).toBe('123456789');
        });

        it('should log successful bookmark fetches with count', async () => {
            // Arrange
            const client = new XAPIClient();
            const mockClient = {
                v2: { bookmarks: mockBookmarks },
            };

            const token = {
                client: mockClient as any,
                userId: '123456789',
                username: 'testuser',
            };

            mockBookmarks.mockResolvedValue({
                data: {
                    data: [
                        {
                            id: '1',
                            text: 'Bookmark 1',
                            author_id: 'author1',
                            created_at: '2024-01-15T10:30:00.000Z',
                            public_metrics: { like_count: 1, retweet_count: 0, reply_count: 0 },
                        },
                        {
                            id: '2',
                            text: 'Bookmark 2',
                            author_id: 'author1',
                            created_at: '2024-01-15T11:30:00.000Z',
                            public_metrics: { like_count: 2, retweet_count: 1, reply_count: 0 },
                        },
                    ],
                },
                includes: {
                    users: [{ id: 'author1', username: 'author', name: 'Author' }],
                },
                meta: { next_token: 'next_cursor' },
                rateLimit: { limit: 180, remaining: 179, reset: 1705320000 },
            });

            // Act
            await client.getBookmarks(token);

            // Assert
            const logs = logger.getEntries();
            const infoLogs = logs.filter((log) => log.level === 'info');
            expect(infoLogs.length).toBeGreaterThan(0);

            const successLog = infoLogs.find((log) => log.message.includes('Successfully fetched'));
            expect(successLog).toBeDefined();
            expect(successLog?.message).toContain('2 bookmarks');
            expect(successLog?.context?.hasNextCursor).toBe(true);
        });
    });

    describe('Property-Based Tests', () => {
        /**
         * Property 19: Error logging with context
         * Validates: Requirements 8.1, 8.2
         *
         * For any error during export or analysis, a log entry should be created
         * containing the error message, operation context, and relevant identifiers
         */
        it('Property 19: All errors should be logged with operation context and identifiers', async () => {
            const fc = await import('fast-check');

            await fc.assert(
                fc.asyncProperty(
                    // Generate arbitrary error scenarios
                    fc.record({
                        operation: fc.constantFrom('authenticate', 'getBookmarks', 'getUserInfo'),
                        errorType: fc.constantFrom('network', 'api404', 'api500', 'generic'),
                        bookmarkId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
                            nil: undefined,
                        }),
                        cursor: fc.option(fc.string({ minLength: 1, maxLength: 30 }), {
                            nil: undefined,
                        }),
                        userId: fc.option(fc.string({ minLength: 1, maxLength: 20 }), {
                            nil: undefined,
                        }),
                    }),
                    async (scenario) => {
                        // Clear logs before each test
                        logger.clear();

                        const client = new XAPIClient({
                            maxRetries: 0, // No retries to simplify test
                            initialDelayMs: 10,
                            maxDelayMs: 100,
                            backoffMultiplier: 2,
                        });

                        // Create appropriate error based on type
                        let mockError: Error;
                        switch (scenario.errorType) {
                            case 'network':
                                mockError = new Error('Network error');
                                break;
                            case 'api404':
                                mockError = new Error('Not found');
                                (mockError as any).code = 404;
                                break;
                            case 'api500':
                                mockError = new Error('Internal server error');
                                (mockError as any).code = 500;
                                break;
                            default:
                                mockError = new Error('Generic error');
                        }

                        // Execute operation and expect it to fail
                        try {
                            if (scenario.operation === 'authenticate') {
                                mockMe.mockRejectedValue(mockError);
                                await client.authenticate({
                                    apiKey: 'test-key',
                                    apiSecret: 'test-secret',
                                    accessToken: 'test-token',
                                    accessSecret: 'test-secret',
                                });
                            } else if (scenario.operation === 'getBookmarks') {
                                mockBookmarks.mockRejectedValue(mockError);
                                const token = {
                                    client: { v2: { bookmarks: mockBookmarks } } as any,
                                    userId: scenario.userId || 'test-user',
                                    username: 'testuser',
                                };
                                await client.getBookmarks(token, scenario.cursor);
                            } else if (scenario.operation === 'getUserInfo') {
                                mockMe.mockRejectedValue(mockError);
                                const token = {
                                    client: { v2: { me: mockMe } } as any,
                                    userId: scenario.userId || 'test-user',
                                    username: 'testuser',
                                };
                                await client.getUserInfo(token);
                            }
                        } catch (error) {
                            // Expected to fail
                        }

                        // Verify error was logged
                        const logs = logger.getEntries();
                        const errorLogs = logs.filter((log) => log.level === 'error');

                        // Property: At least one error log should exist
                        expect(errorLogs.length).toBeGreaterThan(0);

                        const lastError = errorLogs[errorLogs.length - 1];

                        // Property: Error log must contain a message
                        expect(lastError.message).toBeDefined();
                        expect(lastError.message.length).toBeGreaterThan(0);

                        // Property: Error log must contain operation context
                        expect(lastError.context).toBeDefined();
                        expect(lastError.context?.operation).toBe(scenario.operation);

                        // Property: If cursor was provided, it should be in context
                        if (scenario.cursor && scenario.operation === 'getBookmarks') {
                            expect(lastError.context?.cursor).toBe(scenario.cursor);
                        }

                        // Property: Error log should contain relevant identifiers when available
                        // For getBookmarks, cursor is logged which is a relevant identifier
                        if (scenario.operation === 'getBookmarks' && scenario.cursor) {
                            expect(lastError.context?.cursor).toBe(scenario.cursor);
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });

        /**
         * Property: Warning logs should include relevant identifiers
         * Validates: Requirements 8.1, 8.2
         *
         * For any warning during export (like missing author), a log entry should
         * contain the warning message, operation context, and relevant identifiers
         */
        it('Property: All warnings should be logged with operation context and identifiers', async () => {
            const fc = await import('fast-check');

            await fc.assert(
                fc.asyncProperty(
                    // Generate arbitrary bookmark scenarios with missing authors
                    fc.record({
                        bookmarkId: fc.string({ minLength: 1, maxLength: 20 }),
                        authorId: fc.string({ minLength: 1, maxLength: 20 }),
                        text: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    async (bookmark) => {
                        // Clear logs before each test
                        logger.clear();

                        const client = new XAPIClient();
                        const mockClient = {
                            v2: { bookmarks: mockBookmarks },
                        };

                        const token = {
                            client: mockClient as any,
                            userId: '123456789',
                            username: 'testuser',
                        };

                        // Mock response with missing author
                        mockBookmarks.mockResolvedValue({
                            data: {
                                data: [
                                    {
                                        id: bookmark.bookmarkId,
                                        text: bookmark.text,
                                        author_id: bookmark.authorId,
                                        created_at: '2024-01-15T10:30:00.000Z',
                                        public_metrics: {
                                            like_count: 0,
                                            retweet_count: 0,
                                            reply_count: 0,
                                        },
                                    },
                                ],
                            },
                            includes: {
                                users: [], // No users, so author will be missing
                            },
                            meta: {},
                            rateLimit: {
                                limit: 180,
                                remaining: 179,
                                reset: 1705320000,
                            },
                        });

                        // Act
                        await client.getBookmarks(token);

                        // Assert
                        const logs = logger.getEntries();
                        const warnings = logs.filter((log) => log.level === 'warn');

                        // Property: At least one warning should exist for missing author
                        expect(warnings.length).toBeGreaterThan(0);

                        const authorWarning = warnings.find((log) =>
                            log.message.includes('missing author')
                        );

                        // Property: Warning must exist and contain context
                        expect(authorWarning).toBeDefined();
                        expect(authorWarning?.context).toBeDefined();

                        // Property: Warning must contain operation context
                        expect(authorWarning?.context?.operation).toBe('getBookmarks');

                        // Property: Warning must contain bookmark identifier
                        expect(authorWarning?.context?.bookmarkId).toBe(bookmark.bookmarkId);
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});
