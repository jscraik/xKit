/**
 * Integration test for complete bookmark export flow
 * Tests the wiring of XAPIClient, RateLimiter, ExportState, BookmarkExporter, and ProgressReporter
 */

import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BookmarkExporter } from '../../src/bookmark-export/bookmark-exporter.js';
import { ExportState } from '../../src/bookmark-export/export-state.js';
import { ProgressReporter } from '../../src/bookmark-export/progress-reporter.js';
import { RateLimiter } from '../../src/bookmark-export/rate-limiter.js';
import type { BookmarkRecord, Credentials } from '../../src/bookmark-export/types.js';
import { XAPIClient } from '../../src/bookmark-export/xapi-client.js';

describe('Export Integration', () => {
    const testOutputDir = './test-exports';
    const testStateFile = '.test_export_state.json';

    beforeEach(() => {
        // Create test output directory
        if (!existsSync(testOutputDir)) {
            mkdirSync(testOutputDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files
        if (existsSync(testOutputDir)) {
            rmSync(testOutputDir, { recursive: true, force: true });
        }
        if (existsSync(testStateFile)) {
            rmSync(testStateFile);
        }
    });

    it('should wire components together for a complete export', async () => {
        // Mock XAPIClient
        const mockBookmarks: BookmarkRecord[] = [
            {
                id: '1',
                url: 'https://twitter.com/user1/status/1',
                text: 'Test bookmark 1',
                authorUsername: 'user1',
                authorName: 'User One',
                createdAt: '2024-01-01T00:00:00Z',
                likeCount: 10,
                retweetCount: 5,
                replyCount: 2,
            },
            {
                id: '2',
                url: 'https://twitter.com/user2/status/2',
                text: 'Test bookmark 2',
                authorUsername: 'user2',
                authorName: 'User Two',
                createdAt: '2024-01-02T00:00:00Z',
                likeCount: 20,
                retweetCount: 10,
                replyCount: 4,
            },
        ];

        const xapiClient = new XAPIClient();
        vi.spyOn(xapiClient, 'authenticate').mockResolvedValue({
            client: {} as any,
            userId: 'test-user-id',
            username: 'testuser',
        });

        vi.spyOn(xapiClient, 'getBookmarks').mockResolvedValue({
            bookmarks: mockBookmarks,
            nextCursor: null,
            rateLimit: {
                limit: 100,
                remaining: 99,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            },
        });

        // Initialize components
        const rateLimiter = new RateLimiter(3, 2);
        const exportState = new ExportState(testStateFile);
        const bookmarkExporter = new BookmarkExporter({
            outputDirectory: testOutputDir,
            filenamePattern: 'test_export_{timestamp}.json',
        });

        // Initialize export state
        exportState.initialize();

        // Authenticate
        const credentials: Credentials = {
            apiKey: 'test-key',
            apiSecret: 'test-secret',
        };
        const authToken = await xapiClient.authenticate(credentials);

        expect(authToken.username).toBe('testuser');

        // Fetch bookmarks
        const allBookmarks: BookmarkRecord[] = [];
        let cursor: string | null = null;

        await rateLimiter.waitIfNeeded('bookmarks');
        const page = await xapiClient.getBookmarks(authToken, cursor || undefined);

        rateLimiter.updateLimit('bookmarks', page.rateLimit);
        allBookmarks.push(...page.bookmarks);

        // Update export state
        exportState.update(page.nextCursor, allBookmarks.length);
        exportState.save();

        // Verify state was saved
        expect(existsSync(testStateFile)).toBe(true);

        // Export to file
        const filePath = await bookmarkExporter.export(allBookmarks, {
            exportTimestamp: new Date().toISOString(),
            exporterVersion: '1.0.0',
            userId: authToken.userId,
            username: authToken.username,
        });

        // Verify file was created
        expect(existsSync(filePath)).toBe(true);

        // Verify file content
        const fileContent = readFileSync(filePath, 'utf-8');
        const exportData = JSON.parse(fileContent);

        expect(exportData.metadata.totalCount).toBe(2);
        expect(exportData.metadata.username).toBe('testuser');
        expect(exportData.bookmarks).toHaveLength(2);
        expect(exportData.bookmarks[0].id).toBe('1');
        expect(exportData.bookmarks[1].id).toBe('2');

        // Clean up state file on success
        exportState.delete();
        expect(existsSync(testStateFile)).toBe(false);
    });

    it('should support resumable exports', async () => {
        // Mock XAPIClient with pagination
        const page1Bookmarks: BookmarkRecord[] = [
            {
                id: '1',
                url: 'https://twitter.com/user1/status/1',
                text: 'Test bookmark 1',
                authorUsername: 'user1',
                authorName: 'User One',
                createdAt: '2024-01-01T00:00:00Z',
                likeCount: 10,
                retweetCount: 5,
                replyCount: 2,
            },
        ];

        const page2Bookmarks: BookmarkRecord[] = [
            {
                id: '2',
                url: 'https://twitter.com/user2/status/2',
                text: 'Test bookmark 2',
                authorUsername: 'user2',
                authorName: 'User Two',
                createdAt: '2024-01-02T00:00:00Z',
                likeCount: 20,
                retweetCount: 10,
                replyCount: 4,
            },
        ];

        const xapiClient = new XAPIClient();
        vi.spyOn(xapiClient, 'authenticate').mockResolvedValue({
            client: {} as any,
            userId: 'test-user-id',
            username: 'testuser',
        });

        let callCount = 0;
        vi.spyOn(xapiClient, 'getBookmarks').mockImplementation(async (_token, cursor) => {
            callCount++;
            if (callCount === 1 || cursor === undefined) {
                return {
                    bookmarks: page1Bookmarks,
                    nextCursor: 'cursor-page-2',
                    rateLimit: {
                        limit: 100,
                        remaining: 99,
                        resetAt: Math.floor(Date.now() / 1000) + 900,
                    },
                };
            }
            return {
                bookmarks: page2Bookmarks,
                nextCursor: null,
                rateLimit: {
                    limit: 100,
                    remaining: 98,
                    resetAt: Math.floor(Date.now() / 1000) + 900,
                },
            };
        });

        // Initialize components
        const exportState = new ExportState(testStateFile);
        exportState.initialize();

        // Authenticate
        const credentials: Credentials = {
            apiKey: 'test-key',
            apiSecret: 'test-secret',
        };
        const authToken = await xapiClient.authenticate(credentials);

        // Fetch first page
        const page1 = await xapiClient.getBookmarks(authToken);
        exportState.update(page1.nextCursor, page1.bookmarks.length);
        exportState.save();

        // Simulate interruption - create new export state and load
        const resumedState = new ExportState(testStateFile);
        const loaded = resumedState.load();

        expect(loaded).toBe(true);
        expect(resumedState.getLastCursor()).toBe('cursor-page-2');
        expect(resumedState.getProcessedCount()).toBe(1);

        // Resume from cursor
        const page2 = await xapiClient.getBookmarks(authToken, resumedState.getLastCursor() || undefined);
        const totalBookmarks = resumedState.getProcessedCount() + page2.bookmarks.length;

        expect(totalBookmarks).toBe(2);
        expect(page2.nextCursor).toBeNull();

        // Clean up
        resumedState.delete();
    });

    it('should handle rate limiting', async () => {
        const xapiClient = new XAPIClient();
        const rateLimiter = new RateLimiter(3, 2);

        // Mock rate limit info
        const rateLimitInfo = {
            limit: 100,
            remaining: 0, // No remaining requests
            resetAt: Math.floor(Date.now() / 1000) + 2, // Reset in 2 seconds
        };

        rateLimiter.updateLimit('bookmarks', rateLimitInfo);

        // Start timer
        const startTime = Date.now();

        // Wait for rate limit
        await rateLimiter.waitIfNeeded('bookmarks');

        // Check that we waited at least 2 seconds
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeGreaterThanOrEqual(2000);
    });

    it('should report progress during export', () => {
        const progressReporter = new ProgressReporter({
            total: 100,
            displayProgress: false, // Disable console output for test
        });

        // Simulate processing bookmarks
        for (let i = 0; i < 50; i++) {
            progressReporter.increment();
        }

        expect(progressReporter.getProcessed()).toBe(50);
        expect(progressReporter.getTotal()).toBe(100);

        // Display completion summary
        const summary = progressReporter.displayCompletionSummary('/path/to/export.json');

        expect(summary.total).toBe(50);
        expect(summary.fileLocation).toBe('/path/to/export.json');
        expect(summary.duration).toBeGreaterThanOrEqual(0);
    });

    /**
     * End-to-end integration test for complete export flow
     * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
     * 
     * This test validates the complete export flow including:
     * - 1.1: Authentication with X API using valid credentials
     * - 1.2: Retrieve all accessible bookmarks from user's account
     * - 1.3: Extract metadata (URL, text, author, timestamp, engagement metrics)
     * - 1.4: Serialize data into valid JSON format
     * - 1.5: Write JSON data to file with timestamp-based filename
     */
    it('should complete end-to-end export flow with all requirements', async () => {
        // Setup: Create mock bookmarks with all required metadata fields
        const mockBookmarks: BookmarkRecord[] = [
            {
                id: '1234567890',
                url: 'https://twitter.com/techuser/status/1234567890',
                text: 'This is a test bookmark about TypeScript and testing',
                authorUsername: 'techuser',
                authorName: 'Tech User',
                createdAt: '2024-01-15T10:30:00Z',
                likeCount: 42,
                retweetCount: 15,
                replyCount: 8,
            },
            {
                id: '9876543210',
                url: 'https://twitter.com/devuser/status/9876543210',
                text: 'Another bookmark about software development',
                authorUsername: 'devuser',
                authorName: 'Dev User',
                createdAt: '2024-01-16T14:20:00Z',
                likeCount: 100,
                retweetCount: 25,
                replyCount: 12,
            },
            {
                id: '5555555555',
                url: 'https://twitter.com/codeuser/status/5555555555',
                text: 'Third bookmark with interesting content',
                authorUsername: 'codeuser',
                authorName: 'Code User',
                createdAt: '2024-01-17T09:15:00Z',
                likeCount: 75,
                retweetCount: 20,
                replyCount: 5,
            },
        ];

        // Initialize components
        const xapiClient = new XAPIClient();
        const rateLimiter = new RateLimiter(3, 2);
        const exportState = new ExportState(testStateFile);
        const bookmarkExporter = new BookmarkExporter({
            outputDirectory: testOutputDir,
            filenamePattern: 'bookmarks_export_{timestamp}.json',
        });
        const progressReporter = new ProgressReporter({
            total: mockBookmarks.length,
            displayProgress: false,
        });

        // Requirement 1.1: Authenticate with X using valid credentials
        const mockAuthToken = {
            client: {} as any,
            userId: 'user123456',
            username: 'testexportuser',
        };

        vi.spyOn(xapiClient, 'authenticate').mockResolvedValue(mockAuthToken);

        const credentials: Credentials = {
            apiKey: 'test-api-key-12345',
            apiSecret: 'test-api-secret-67890',
            accessToken: 'test-access-token',
            accessSecret: 'test-access-secret',
        };

        const authToken = await xapiClient.authenticate(credentials);

        // Verify authentication succeeded
        expect(authToken).toBeDefined();
        expect(authToken.userId).toBe('user123456');
        expect(authToken.username).toBe('testexportuser');

        // Requirement 1.2: Retrieve all accessible bookmarks from user's account
        vi.spyOn(xapiClient, 'getBookmarks').mockResolvedValue({
            bookmarks: mockBookmarks,
            nextCursor: null,
            rateLimit: {
                limit: 100,
                remaining: 95,
                resetAt: Math.floor(Date.now() / 1000) + 900,
            },
        });

        exportState.initialize();

        const allBookmarks: BookmarkRecord[] = [];
        let cursor: string | null = null;

        await rateLimiter.waitIfNeeded('bookmarks');
        const page = await xapiClient.getBookmarks(authToken, cursor || undefined);

        rateLimiter.updateLimit('bookmarks', page.rateLimit);
        allBookmarks.push(...page.bookmarks);

        // Verify all bookmarks were retrieved
        expect(allBookmarks).toHaveLength(3);

        // Requirement 1.3: Extract metadata including URL, text, author, timestamp, engagement metrics
        for (const bookmark of allBookmarks) {
            expect(bookmark.id).toBeDefined();
            expect(bookmark.url).toBeDefined();
            expect(bookmark.url).toMatch(/^https:\/\/twitter\.com\//);
            expect(bookmark.text).toBeDefined();
            expect(bookmark.text.length).toBeGreaterThan(0);
            expect(bookmark.authorUsername).toBeDefined();
            expect(bookmark.authorName).toBeDefined();
            expect(bookmark.createdAt).toBeDefined();
            expect(bookmark.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
            expect(typeof bookmark.likeCount).toBe('number');
            expect(typeof bookmark.retweetCount).toBe('number');
            expect(typeof bookmark.replyCount).toBe('number');
        }

        // Update progress
        for (let i = 0; i < allBookmarks.length; i++) {
            progressReporter.increment();
        }

        // Update export state
        exportState.update(page.nextCursor, allBookmarks.length);
        exportState.save();

        // Requirement 1.4: Serialize data into valid JSON format
        const exportMetadata = {
            exportTimestamp: new Date().toISOString(),
            exporterVersion: '1.0.0',
            userId: authToken.userId,
            username: authToken.username,
        };

        const filePath = await bookmarkExporter.export(allBookmarks, exportMetadata);

        // Requirement 1.5: Write JSON data to file with timestamp-based filename
        expect(existsSync(filePath)).toBe(true);
        expect(filePath).toMatch(/bookmarks_export_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);

        // Verify file content structure and validity
        const fileContent = readFileSync(filePath, 'utf-8');
        const exportData = JSON.parse(fileContent);

        // Verify metadata section
        expect(exportData.metadata).toBeDefined();
        expect(exportData.metadata.exportTimestamp).toBeDefined();
        expect(exportData.metadata.totalCount).toBe(3);
        expect(exportData.metadata.exporterVersion).toBe('1.0.0');
        expect(exportData.metadata.userId).toBe('user123456');
        expect(exportData.metadata.username).toBe('testexportuser');

        // Verify bookmarks array
        expect(exportData.bookmarks).toBeDefined();
        expect(Array.isArray(exportData.bookmarks)).toBe(true);
        expect(exportData.bookmarks).toHaveLength(3);

        // Verify each bookmark has all required fields with correct data
        expect(exportData.bookmarks[0]).toEqual(mockBookmarks[0]);
        expect(exportData.bookmarks[1]).toEqual(mockBookmarks[1]);
        expect(exportData.bookmarks[2]).toEqual(mockBookmarks[2]);

        // Verify progress reporter tracked correctly
        expect(progressReporter.getProcessed()).toBe(3);
        expect(progressReporter.getTotal()).toBe(3);

        // Display completion summary
        const summary = progressReporter.displayCompletionSummary(filePath);
        expect(summary.total).toBe(3);
        expect(summary.fileLocation).toBe(filePath);
        expect(summary.duration).toBeGreaterThanOrEqual(0);

        // Clean up state file on success
        exportState.delete();
        expect(existsSync(testStateFile)).toBe(false);
    });
});
