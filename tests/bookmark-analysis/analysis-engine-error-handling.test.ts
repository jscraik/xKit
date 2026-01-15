/**
 * Unit tests for AnalysisEngine error handling
 * Tests for Requirements 8.2 and 8.3
 */

import * as fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisEngine, type Analyzer } from '../../src/bookmark-analysis/analysis-engine.js';
import type { AnalysisResult } from '../../src/bookmark-analysis/types.js';
import { Logger } from '../../src/bookmark-export/logger.js';
import type { BookmarkExport, BookmarkRecord } from '../../src/bookmark-export/types.js';

describe('AnalysisEngine - Error Handling', () => {
    let tempDir: string;

    beforeEach(async () => {
        tempDir = await fs.mkdtemp('analysis-engine-error-test-');
    });

    afterEach(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    const sampleBookmark: BookmarkRecord = {
        id: '1',
        url: 'https://twitter.com/user/status/1',
        text: 'Test tweet',
        authorUsername: 'author',
        authorName: 'Author Name',
        createdAt: '2024-01-01T00:00:00.000Z',
        likeCount: 10,
        retweetCount: 5,
        replyCount: 2,
    };

    describe('Error logging with context (Requirement 8.2)', () => {
        it('should log errors with context when analyzer fails', async () => {
            const logger = new Logger();
            const logSpy = vi.spyOn(logger, 'error');

            const failingAnalyzer: Analyzer = {
                name: 'failing-analyzer',
                analyze: vi.fn().mockRejectedValue(new Error('Analysis failed')),
            };

            const engine = new AnalysisEngine({
                analyzers: [failingAnalyzer],
                logger,
            });

            await engine.analyzeBookmark(sampleBookmark);

            expect(logSpy).toHaveBeenCalledWith(
                'Error analyzing bookmark with failing-analyzer',
                expect.objectContaining({
                    operation: 'analyzeBookmark',
                    bookmarkId: '1',
                    analyzerName: 'failing-analyzer',
                    error: 'Analysis failed',
                })
            );
        });

        it('should track errors in error summary', async () => {
            const failingAnalyzer: Analyzer = {
                name: 'failing-analyzer',
                analyze: vi.fn().mockRejectedValue(new Error('Analysis failed')),
            };

            const engine = new AnalysisEngine({
                analyzers: [failingAnalyzer],
            });

            await engine.analyzeBookmark(sampleBookmark);

            const errorSummary = engine.getErrorSummary();
            expect(errorSummary.totalErrors).toBe(1);
            expect(errorSummary.bookmarkErrors).toHaveLength(1);
            expect(errorSummary.bookmarkErrors[0]).toEqual({
                bookmarkId: '1',
                analyzerName: 'failing-analyzer',
                error: 'Analysis failed',
            });
        });

        it('should continue processing remaining bookmarks after error', async () => {
            const failingAnalyzer: Analyzer = {
                name: 'failing-analyzer',
                analyze: vi.fn()
                    .mockRejectedValueOnce(new Error('First bookmark failed'))
                    .mockResolvedValueOnce({ categories: ['success'] } as AnalysisResult),
            };

            const exportData: BookmarkExport = {
                metadata: {
                    exportTimestamp: '2024-01-01T00:00:00.000Z',
                    totalCount: 2,
                    exporterVersion: '1.0.0',
                    userId: 'user123',
                    username: 'testuser',
                },
                bookmarks: [
                    { ...sampleBookmark, id: '1' },
                    { ...sampleBookmark, id: '2' },
                ],
            };

            const engine = new AnalysisEngine({
                analyzers: [failingAnalyzer],
            });

            const result = await engine.analyzeExport(exportData);

            // Both bookmarks should be processed
            expect(result.bookmarks).toHaveLength(2);
            // Second bookmark should have categories
            expect(result.bookmarks[1].categories).toEqual(['success']);
            // Error summary should be included
            expect(result.metadata.errorSummary).toBeDefined();
            expect(result.metadata.errorSummary?.totalErrors).toBe(1);
        });
    });

    describe('Error summary in metadata (Requirement 8.2)', () => {
        it('should include error summary in metadata when errors occur', async () => {
            const failingAnalyzer: Analyzer = {
                name: 'failing-analyzer',
                analyze: vi.fn().mockRejectedValue(new Error('Analysis failed')),
            };

            const exportData: BookmarkExport = {
                metadata: {
                    exportTimestamp: '2024-01-01T00:00:00.000Z',
                    totalCount: 1,
                    exporterVersion: '1.0.0',
                    userId: 'user123',
                    username: 'testuser',
                },
                bookmarks: [sampleBookmark],
            };

            const engine = new AnalysisEngine({
                analyzers: [failingAnalyzer],
            });

            const result = await engine.analyzeExport(exportData);

            expect(result.metadata.errorSummary).toBeDefined();
            expect(result.metadata.errorSummary?.totalErrors).toBe(1);
            expect(result.metadata.errorSummary?.bookmarkErrors).toHaveLength(1);
        });

        it('should not include error summary when no errors occur', async () => {
            const workingAnalyzer: Analyzer = {
                name: 'working-analyzer',
                analyze: vi.fn().mockResolvedValue({ categories: ['tech'] } as AnalysisResult),
            };

            const exportData: BookmarkExport = {
                metadata: {
                    exportTimestamp: '2024-01-01T00:00:00.000Z',
                    totalCount: 1,
                    exporterVersion: '1.0.0',
                    userId: 'user123',
                    username: 'testuser',
                },
                bookmarks: [sampleBookmark],
            };

            const engine = new AnalysisEngine({
                analyzers: [workingAnalyzer],
            });

            const result = await engine.analyzeExport(exportData);

            expect(result.metadata.errorSummary).toBeUndefined();
        });
    });

    describe('Partial results on critical failure (Requirement 8.3)', () => {
        it('should write partial results when critical error occurs', async () => {
            const outputPath = `${tempDir}/output.json`;

            const engine = new AnalysisEngine({
                analyzers: [],
            });

            // Try to analyze a non-existent file (critical error)
            await expect(
                engine.analyze('/nonexistent/file.json', outputPath)
            ).rejects.toThrow();

            // Check that partial results file was created
            const partialPath = `${tempDir}/output_partial.json`;
            const partialExists = await fs.access(partialPath).then(() => true).catch(() => false);
            expect(partialExists).toBe(true);

            // Verify partial results content
            const partialContent = await fs.readFile(partialPath, 'utf-8');
            const partialData = JSON.parse(partialContent);
            expect(partialData.metadata.errorSummary).toBeDefined();
            expect(partialData.metadata.errorSummary.criticalErrors).toHaveLength(1);
        });

        it('should include critical error in error summary', async () => {
            const outputPath = `${tempDir}/output.json`;

            const engine = new AnalysisEngine({
                analyzers: [],
            });

            try {
                await engine.analyze('/nonexistent/file.json', outputPath);
            } catch (error) {
                // Expected to throw
            }

            const errorSummary = engine.getErrorSummary();
            expect(errorSummary.criticalErrors).toHaveLength(1);
            expect(errorSummary.criticalErrors[0]).toContain('ENOENT');
        });
    });

    describe('Error summary management', () => {
        it('should reset error summary', async () => {
            const failingAnalyzer: Analyzer = {
                name: 'failing-analyzer',
                analyze: vi.fn().mockRejectedValue(new Error('Analysis failed')),
            };

            const engine = new AnalysisEngine({
                analyzers: [failingAnalyzer],
            });

            await engine.analyzeBookmark(sampleBookmark);

            let errorSummary = engine.getErrorSummary();
            expect(errorSummary.totalErrors).toBe(1);

            engine.resetErrorSummary();

            errorSummary = engine.getErrorSummary();
            expect(errorSummary.totalErrors).toBe(0);
            expect(errorSummary.bookmarkErrors).toHaveLength(0);
            expect(errorSummary.criticalErrors).toHaveLength(0);
        });

        it('should accumulate errors across multiple bookmarks', async () => {
            const failingAnalyzer: Analyzer = {
                name: 'failing-analyzer',
                analyze: vi.fn().mockRejectedValue(new Error('Analysis failed')),
            };

            const engine = new AnalysisEngine({
                analyzers: [failingAnalyzer],
            });

            await engine.analyzeBookmark({ ...sampleBookmark, id: '1' });
            await engine.analyzeBookmark({ ...sampleBookmark, id: '2' });
            await engine.analyzeBookmark({ ...sampleBookmark, id: '3' });

            const errorSummary = engine.getErrorSummary();
            expect(errorSummary.totalErrors).toBe(3);
            expect(errorSummary.bookmarkErrors).toHaveLength(3);
        });
    });
});
