/**
 * Tests for BookmarkExporter class
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BookmarkExporter } from '../../src/bookmark-export/bookmark-exporter.js';
import type { BookmarkRecord, ExportMetadata } from '../../src/bookmark-export/types.js';

const TEST_OUTPUT_DIR = './test-exports';

describe('BookmarkExporter', () => {
    let exporter: BookmarkExporter;

    beforeEach(async () => {
        // Create test output directory
        await mkdir(TEST_OUTPUT_DIR, { recursive: true });
        exporter = new BookmarkExporter({ outputDirectory: TEST_OUTPUT_DIR });
    });

    afterEach(async () => {
        // Clean up test output directory
        await rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
    });

    describe('export', () => {
        it('should export bookmarks to JSON file with metadata', async () => {
            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet',
                    authorUsername: 'testuser',
                    authorName: 'Test User',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 10,
                    retweetCount: 5,
                    replyCount: 2,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            const filepath = await exporter.export(bookmarks, metadata);

            // Verify file was created
            expect(existsSync(filepath)).toBe(true);

            // Read and parse the file
            const content = await readFile(filepath, 'utf-8');
            const parsed = JSON.parse(content);

            // Verify structure
            expect(parsed).toHaveProperty('metadata');
            expect(parsed).toHaveProperty('bookmarks');
            expect(parsed.metadata.totalCount).toBe(1);
            expect(parsed.bookmarks).toHaveLength(1);
            expect(parsed.bookmarks[0]).toEqual(bookmarks[0]);
        });

        it('should validate output against JSON schema', async () => {
            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet',
                    authorUsername: 'testuser',
                    authorName: 'Test User',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 10,
                    retweetCount: 5,
                    replyCount: 2,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            // Should not throw validation error
            await expect(exporter.export(bookmarks, metadata)).resolves.toBeDefined();
        });

        it('should use timestamp-based filename', async () => {
            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet',
                    authorUsername: 'testuser',
                    authorName: 'Test User',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 10,
                    retweetCount: 5,
                    replyCount: 2,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            const filepath = await exporter.export(bookmarks, metadata);

            // Verify filename contains timestamp pattern
            expect(filepath).toMatch(/bookmarks_export_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
            expect(filepath).toMatch(/\.json$/);
        });

        it('should handle file collision with unique suffix', async () => {
            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet',
                    authorUsername: 'testuser',
                    authorName: 'Test User',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 10,
                    retweetCount: 5,
                    replyCount: 2,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            // Use a fixed filename pattern to ensure collision
            exporter.setFilenamePattern('test_export.json');

            // Export first time
            const filepath1 = await exporter.export(bookmarks, metadata);

            // Export second time with same filename (simulate collision)
            const filepath2 = await exporter.export(bookmarks, metadata);
            const filepath3 = await exporter.export(bookmarks, metadata);

            // Verify all files exist and have different names
            expect(existsSync(filepath1)).toBe(true);
            expect(existsSync(filepath2)).toBe(true);
            expect(existsSync(filepath3)).toBe(true);

            // First file should have the original name
            expect(filepath1).toMatch(/test_export\.json$/);

            // Second and third files should have unique suffixes
            expect(filepath2).not.toBe(filepath1);
            expect(filepath3).not.toBe(filepath1);
            expect(filepath2).not.toBe(filepath3);
            expect(filepath2).toMatch(/_\d+_\d+\.json$/);
            expect(filepath3).toMatch(/_\d+_\d+\.json$/);
        });

        it('should export empty bookmarks array', async () => {
            const bookmarks: BookmarkRecord[] = [];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            const filepath = await exporter.export(bookmarks, metadata);

            // Read and parse the file
            const content = await readFile(filepath, 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.metadata.totalCount).toBe(0);
            expect(parsed.bookmarks).toHaveLength(0);
        });

        it('should export multiple bookmarks', async () => {
            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet 1',
                    authorUsername: 'testuser1',
                    authorName: 'Test User 1',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 10,
                    retweetCount: 5,
                    replyCount: 2,
                },
                {
                    id: '987654321',
                    url: 'https://twitter.com/user/status/987654321',
                    text: 'Test tweet 2',
                    authorUsername: 'testuser2',
                    authorName: 'Test User 2',
                    createdAt: '2024-01-16T12:00:00Z',
                    likeCount: 20,
                    retweetCount: 10,
                    replyCount: 4,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            const filepath = await exporter.export(bookmarks, metadata);

            // Read and parse the file
            const content = await readFile(filepath, 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.metadata.totalCount).toBe(2);
            expect(parsed.bookmarks).toHaveLength(2);
            expect(parsed.bookmarks[0]).toEqual(bookmarks[0]);
            expect(parsed.bookmarks[1]).toEqual(bookmarks[1]);
        });

        it('should handle bookmarks with zero engagement metrics', async () => {
            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet',
                    authorUsername: 'testuser',
                    authorName: 'Test User',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 0,
                    retweetCount: 0,
                    replyCount: 0,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            const filepath = await exporter.export(bookmarks, metadata);

            // Read and parse the file
            const content = await readFile(filepath, 'utf-8');
            const parsed = JSON.parse(content);

            expect(parsed.bookmarks[0].likeCount).toBe(0);
            expect(parsed.bookmarks[0].retweetCount).toBe(0);
            expect(parsed.bookmarks[0].replyCount).toBe(0);
        });
    });

    describe('configuration', () => {
        it('should allow setting output directory', async () => {
            const customDir = join(TEST_OUTPUT_DIR, 'custom');
            await mkdir(customDir, { recursive: true });

            exporter.setOutputDirectory(customDir);

            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet',
                    authorUsername: 'testuser',
                    authorName: 'Test User',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 10,
                    retweetCount: 5,
                    replyCount: 2,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            const filepath = await exporter.export(bookmarks, metadata);

            expect(filepath).toContain('custom');
            expect(existsSync(filepath)).toBe(true);
        });

        it('should allow setting filename pattern', async () => {
            exporter.setFilenamePattern('custom_{timestamp}_export.json');

            const bookmarks: BookmarkRecord[] = [
                {
                    id: '123456789',
                    url: 'https://twitter.com/user/status/123456789',
                    text: 'Test tweet',
                    authorUsername: 'testuser',
                    authorName: 'Test User',
                    createdAt: '2024-01-15T12:00:00Z',
                    likeCount: 10,
                    retweetCount: 5,
                    replyCount: 2,
                },
            ];

            const metadata: Omit<ExportMetadata, 'totalCount'> = {
                exportTimestamp: '2024-01-15T12:00:00Z',
                exporterVersion: '1.0.0',
                userId: 'user123',
                username: 'testuser',
            };

            const filepath = await exporter.export(bookmarks, metadata);

            expect(filepath).toMatch(/custom_.*_export\.json$/);
        });
    });
});
