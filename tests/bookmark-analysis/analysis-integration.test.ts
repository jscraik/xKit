/**
 * Integration test for complete bookmark analysis flow
 * Tests the end-to-end analysis pipeline with mocked LLM
 * 
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 7.1**
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnalysisEngine } from '../../src/bookmark-analysis/analysis-engine.js';
import { AnalysisOutputWriter } from '../../src/bookmark-analysis/analysis-output-writer.js';
import { LLMCategorizer } from '../../src/bookmark-analysis/llm-categorizer.js';
import type { LLMConfig, ScoringConfig } from '../../src/bookmark-analysis/types.js';
import { UsefulnessScorer } from '../../src/bookmark-analysis/usefulness-scorer.js';
import type { BookmarkExport } from '../../src/bookmark-export/types.js';

describe('Analysis Integration', () => {
    const testInputDir = './test-analysis-input';
    const testOutputDir = './test-analysis-output';
    const testInputFile = join(testInputDir, 'test_export.json');

    beforeEach(() => {
        // Create test directories
        if (!existsSync(testInputDir)) {
            mkdirSync(testInputDir, { recursive: true });
        }
        if (!existsSync(testOutputDir)) {
            mkdirSync(testOutputDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up test files
        if (existsSync(testInputDir)) {
            rmSync(testInputDir, { recursive: true, force: true });
        }
        if (existsSync(testOutputDir)) {
            rmSync(testOutputDir, { recursive: true, force: true });
        }

        // Restore all mocks
        vi.restoreAllMocks();
    });

    /**
     * End-to-end integration test for complete analysis flow
     * 
     * This test validates the complete analysis flow including:
     * - 4.1: Read and parse exported JSON file
     * - 4.2: Send bookmark text to LLM with categorization prompt
     * - 4.3: Extract category labels from LLM response
     * - 4.4: Add categories field to bookmark records
     * - 5.1: Evaluate bookmarks using configurable criteria
     * - 5.3: Assign usefulness scores between 0 and 100
     * - 7.1: Write enriched bookmark data to new JSON file
     * 
     * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 7.1**
     */
    it('should complete end-to-end analysis flow with mocked LLM', async () => {
        // Setup: Create mock export data
        const mockExportData: BookmarkExport = {
            metadata: {
                exportTimestamp: '2024-01-15T10:00:00Z',
                totalCount: 3,
                exporterVersion: '1.0.0',
                userId: 'test-user-123',
                username: 'testuser',
            },
            bookmarks: [
                {
                    id: '1111111111',
                    url: 'https://twitter.com/techuser/status/1111111111',
                    text: 'Exploring the latest advances in machine learning and artificial intelligence. The future is here!',
                    authorUsername: 'techuser',
                    authorName: 'Tech Enthusiast',
                    createdAt: '2024-01-10T08:30:00Z',
                    likeCount: 150,
                    retweetCount: 45,
                    replyCount: 12,
                },
                {
                    id: '2222222222',
                    url: 'https://twitter.com/devuser/status/2222222222',
                    text: 'Just published a new article on TypeScript best practices and design patterns. Check it out!',
                    authorUsername: 'devuser',
                    authorName: 'Developer Pro',
                    createdAt: '2024-01-12T14:20:00Z',
                    likeCount: 200,
                    retweetCount: 60,
                    replyCount: 18,
                },
                {
                    id: '3333333333',
                    url: 'https://twitter.com/foodie/status/3333333333',
                    text: 'Amazing dinner at the new restaurant downtown. Highly recommend the pasta!',
                    authorUsername: 'foodie',
                    authorName: 'Food Lover',
                    createdAt: '2024-01-14T19:45:00Z',
                    likeCount: 50,
                    retweetCount: 10,
                    replyCount: 5,
                },
            ],
        };

        // Write mock export data to file
        writeFileSync(testInputFile, JSON.stringify(mockExportData, null, 2), 'utf-8');

        // Verify input file was created (Requirement 4.1)
        expect(existsSync(testInputFile)).toBe(true);

        // Mock LLM responses for categorization and scoring (Requirements 4.2, 4.3, 5.1, 5.3)
        // The LLM will be called twice per bookmark: once for categorization, once for scoring
        const mockLLMResponses = [
            // First bookmark - categorization
            {
                choices: [
                    {
                        message: {
                            content: 'machine learning, artificial intelligence, technology',
                        },
                    },
                ],
            },
            // First bookmark - scoring
            {
                choices: [
                    {
                        message: {
                            content: '85',
                        },
                    },
                ],
            },
            // Second bookmark - categorization
            {
                choices: [
                    {
                        message: {
                            content: 'programming, typescript, software development',
                        },
                    },
                ],
            },
            // Second bookmark - scoring
            {
                choices: [
                    {
                        message: {
                            content: '90',
                        },
                    },
                ],
            },
            // Third bookmark - categorization
            {
                choices: [
                    {
                        message: {
                            content: 'food, restaurant, lifestyle',
                        },
                    },
                ],
            },
            // Third bookmark - scoring
            {
                choices: [
                    {
                        message: {
                            content: '60',
                        },
                    },
                ],
            },
        ];

        let callCount = 0;
        global.fetch = vi.fn().mockImplementation(async () => {
            const response = mockLLMResponses[callCount];
            callCount++;
            return {
                ok: true,
                json: async () => response,
            };
        });

        // Initialize LLM categorizer (Requirements 4.2, 4.3, 4.4)
        const llmConfig: LLMConfig = {
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-api-key',
            prompt: 'Categorize this bookmark into relevant topics',
            maxCategories: 3,
        };
        const categorizer = new LLMCategorizer(llmConfig);

        // Initialize usefulness scorer (Requirements 5.1, 5.3)
        const scoringConfig: ScoringConfig = {
            method: 'llm',
            weights: {
                engagement: 0.4,
                recency: 0.3,
                contentQuality: 0.3,
            },
            llmConfig,
        };
        const scorer = new UsefulnessScorer(scoringConfig);

        // Initialize analysis engine
        const analysisEngine = new AnalysisEngine({
            analyzers: [categorizer, scorer],
            scoringMethod: 'llm',
        });

        // Requirement 4.1: Read and parse exported JSON file
        const exportData = await analysisEngine.readExportFile(testInputFile);

        expect(exportData).toBeDefined();
        expect(exportData.bookmarks).toHaveLength(3);
        expect(exportData.metadata.username).toBe('testuser');

        // Run analysis on all bookmarks
        const analysisResult = await analysisEngine.analyzeExport(exportData);

        // Verify analysis results
        expect(analysisResult).toBeDefined();
        expect(analysisResult.bookmarks).toHaveLength(3);

        // Requirement 4.4: Verify categories field was added to each bookmark
        for (const bookmark of analysisResult.bookmarks) {
            expect(bookmark.categories).toBeDefined();
            expect(Array.isArray(bookmark.categories)).toBe(true);
            expect(bookmark.categories!.length).toBeGreaterThan(0);
        }

        // Verify specific categories for first bookmark
        expect(analysisResult.bookmarks[0].categories).toContain('machine learning');
        expect(analysisResult.bookmarks[0].categories).toContain('artificial intelligence');
        expect(analysisResult.bookmarks[0].categories).toContain('technology');

        // Verify specific categories for second bookmark
        expect(analysisResult.bookmarks[1].categories).toContain('programming');
        expect(analysisResult.bookmarks[1].categories).toContain('typescript');
        expect(analysisResult.bookmarks[1].categories).toContain('software development');

        // Verify specific categories for third bookmark
        expect(analysisResult.bookmarks[2].categories).toContain('food');
        expect(analysisResult.bookmarks[2].categories).toContain('restaurant');
        expect(analysisResult.bookmarks[2].categories).toContain('lifestyle');

        // Requirement 5.3: Verify usefulness scores are between 0 and 100
        for (const bookmark of analysisResult.bookmarks) {
            expect(bookmark.usefulnessScore).toBeDefined();
            expect(bookmark.usefulnessScore).toBeGreaterThanOrEqual(0);
            expect(bookmark.usefulnessScore).toBeLessThanOrEqual(100);
        }

        // Verify specific scores
        expect(analysisResult.bookmarks[0].usefulnessScore).toBe(85);
        expect(analysisResult.bookmarks[1].usefulnessScore).toBe(90);
        expect(analysisResult.bookmarks[2].usefulnessScore).toBe(60);

        // Verify analysis metadata
        expect(analysisResult.metadata.analysisTimestamp).toBeDefined();
        expect(analysisResult.metadata.categoriesApplied).toBeDefined();
        expect(analysisResult.metadata.categoriesApplied.length).toBeGreaterThan(0);
        expect(analysisResult.metadata.scoringMethod).toBe('llm');
        expect(analysisResult.metadata.analyzersUsed).toContain('LLMCategorizer');
        expect(analysisResult.metadata.analyzersUsed).toContain('UsefulnessScorer');

        // Verify all unique categories are collected
        const expectedCategories = [
            'machine learning',
            'artificial intelligence',
            'technology',
            'programming',
            'typescript',
            'software development',
            'food',
            'restaurant',
            'lifestyle',
        ];
        for (const category of expectedCategories) {
            expect(analysisResult.metadata.categoriesApplied).toContain(category);
        }

        // Requirement 7.1: Write enriched bookmark data to new JSON file
        const outputWriter = new AnalysisOutputWriter({
            outputDirectory: testOutputDir,
            filenamePattern: 'bookmarks_analyzed_{method}_{timestamp}.json',
        });

        const outputPath = await outputWriter.write(analysisResult);

        // Verify output file was created
        expect(existsSync(outputPath)).toBe(true);
        expect(outputPath).toMatch(/bookmarks_analyzed_llm_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);

        // Verify output file content
        const outputContent = readFileSync(outputPath, 'utf-8');
        const outputData = JSON.parse(outputContent);

        // Verify structure
        expect(outputData.metadata).toBeDefined();
        expect(outputData.bookmarks).toBeDefined();
        expect(outputData.bookmarks).toHaveLength(3);

        // Verify original fields are preserved
        expect(outputData.bookmarks[0].id).toBe('1111111111');
        expect(outputData.bookmarks[0].url).toBe('https://twitter.com/techuser/status/1111111111');
        expect(outputData.bookmarks[0].text).toContain('machine learning');
        expect(outputData.bookmarks[0].authorUsername).toBe('techuser');
        expect(outputData.bookmarks[0].likeCount).toBe(150);

        // Verify enriched fields are present
        expect(outputData.bookmarks[0].categories).toContain('machine learning');
        expect(outputData.bookmarks[0].usefulnessScore).toBe(85);

        // Verify metadata in output
        expect(outputData.metadata.analysisTimestamp).toBeDefined();
        expect(outputData.metadata.categoriesApplied).toContain('machine learning');
        expect(outputData.metadata.scoringMethod).toBe('llm');
        expect(outputData.metadata.analyzersUsed).toContain('LLMCategorizer');
        expect(outputData.metadata.analyzersUsed).toContain('UsefulnessScorer');

        // Verify original export metadata is preserved
        expect(outputData.metadata.exportTimestamp).toBe('2024-01-15T10:00:00Z');
        expect(outputData.metadata.totalCount).toBe(3);
        expect(outputData.metadata.exporterVersion).toBe('1.0.0');
        expect(outputData.metadata.userId).toBe('test-user-123');
        expect(outputData.metadata.username).toBe('testuser');
    });

    /**
     * Test analysis flow with hybrid scoring method
     * Validates that both LLM and heuristic scoring work together
     */
    it('should support hybrid scoring method', async () => {
        // Create simple export data
        const mockExportData: BookmarkExport = {
            metadata: {
                exportTimestamp: '2024-01-15T10:00:00Z',
                totalCount: 1,
                exporterVersion: '1.0.0',
                userId: 'test-user',
                username: 'testuser',
            },
            bookmarks: [
                {
                    id: '1111111111',
                    url: 'https://twitter.com/user/status/1111111111',
                    text: 'Test bookmark content',
                    authorUsername: 'user',
                    authorName: 'User',
                    createdAt: '2024-01-10T08:30:00Z',
                    likeCount: 100,
                    retweetCount: 50,
                    replyCount: 10,
                },
            ],
        };

        writeFileSync(testInputFile, JSON.stringify(mockExportData, null, 2), 'utf-8');

        // Mock LLM responses
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: 'technology',
                        },
                    },
                ],
            }),
        });

        // Initialize with hybrid scoring
        const llmConfig: LLMConfig = {
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-api-key',
            prompt: 'Categorize',
            maxCategories: 3,
        };

        const categorizer = new LLMCategorizer(llmConfig);

        const scoringConfig: ScoringConfig = {
            method: 'hybrid',
            weights: {
                engagement: 0.4,
                recency: 0.3,
                contentQuality: 0.3,
            },
            llmConfig,
        };
        const scorer = new UsefulnessScorer(scoringConfig);

        const analysisEngine = new AnalysisEngine({
            analyzers: [categorizer, scorer],
            scoringMethod: 'hybrid',
        });

        const exportData = await analysisEngine.readExportFile(testInputFile);
        const analysisResult = await analysisEngine.analyzeExport(exportData);

        // Verify hybrid scoring produced a valid score
        expect(analysisResult.bookmarks[0].usefulnessScore).toBeDefined();
        expect(analysisResult.bookmarks[0].usefulnessScore).toBeGreaterThanOrEqual(0);
        expect(analysisResult.bookmarks[0].usefulnessScore).toBeLessThanOrEqual(100);
        expect(analysisResult.metadata.scoringMethod).toBe('hybrid');
    });

    /**
     * Test analysis flow with error handling
     * Validates that errors are logged and processing continues
     */
    it('should handle LLM errors gracefully and continue processing', async () => {
        const mockExportData: BookmarkExport = {
            metadata: {
                exportTimestamp: '2024-01-15T10:00:00Z',
                totalCount: 2,
                exporterVersion: '1.0.0',
                userId: 'test-user',
                username: 'testuser',
            },
            bookmarks: [
                {
                    id: '1111111111',
                    url: 'https://twitter.com/user1/status/1111111111',
                    text: 'First bookmark',
                    authorUsername: 'user1',
                    authorName: 'User One',
                    createdAt: '2024-01-10T08:30:00Z',
                    likeCount: 100,
                    retweetCount: 50,
                    replyCount: 10,
                },
                {
                    id: '2222222222',
                    url: 'https://twitter.com/user2/status/2222222222',
                    text: 'Second bookmark',
                    authorUsername: 'user2',
                    authorName: 'User Two',
                    createdAt: '2024-01-11T09:30:00Z',
                    likeCount: 80,
                    retweetCount: 40,
                    replyCount: 8,
                },
            ],
        };

        writeFileSync(testInputFile, JSON.stringify(mockExportData, null, 2), 'utf-8');

        // Mock LLM to fail on first call, succeed on second
        let callCount = 0;
        global.fetch = vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                // First call fails
                return {
                    ok: false,
                    status: 500,
                    text: async () => 'Internal Server Error',
                };
            }
            // Subsequent calls succeed
            return {
                ok: true,
                json: async () => ({
                    choices: [
                        {
                            message: {
                                content: 'technology',
                            },
                        },
                    ],
                }),
            };
        });

        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const llmConfig: LLMConfig = {
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-api-key',
            prompt: 'Categorize',
            maxCategories: 3,
        };

        const categorizer = new LLMCategorizer(llmConfig);

        const analysisEngine = new AnalysisEngine({
            analyzers: [categorizer],
            scoringMethod: 'none',
        });

        const exportData = await analysisEngine.readExportFile(testInputFile);
        const analysisResult = await analysisEngine.analyzeExport(exportData);

        // Verify both bookmarks were processed despite first error
        expect(analysisResult.bookmarks).toHaveLength(2);

        // First bookmark should have "uncategorized" due to error
        expect(analysisResult.bookmarks[0].categories).toContain('uncategorized');

        // Second bookmark should have proper category
        expect(analysisResult.bookmarks[1].categories).toContain('technology');

        // Verify error was logged
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
    });

    /**
     * Test analysis with invalid input file
     * Validates error handling for invalid JSON
     */
    it('should throw error for invalid JSON input', async () => {
        // Write invalid JSON to file
        writeFileSync(testInputFile, 'invalid json content', 'utf-8');

        const analysisEngine = new AnalysisEngine({
            analyzers: [],
            scoringMethod: 'none',
        });

        // Should throw error when trying to read invalid JSON
        await expect(analysisEngine.readExportFile(testInputFile)).rejects.toThrow(/Failed to parse JSON/);
    });

    /**
     * Test analysis with missing input file
     * Validates error handling for missing files
     */
    it('should throw error for missing input file', async () => {
        const nonExistentFile = join(testInputDir, 'nonexistent.json');

        const analysisEngine = new AnalysisEngine({
            analyzers: [],
            scoringMethod: 'none',
        });

        // Should throw error when file doesn't exist
        await expect(analysisEngine.readExportFile(nonExistentFile)).rejects.toThrow();
    });

    /**
     * Test that original bookmark data is preserved during analysis
     * Validates Requirement 7.2
     */
    it('should preserve all original bookmark fields during analysis', async () => {
        const mockExportData: BookmarkExport = {
            metadata: {
                exportTimestamp: '2024-01-15T10:00:00Z',
                totalCount: 1,
                exporterVersion: '1.0.0',
                userId: 'test-user-123',
                username: 'testuser',
            },
            bookmarks: [
                {
                    id: 'original-id-123',
                    url: 'https://twitter.com/original/status/123',
                    text: 'Original text content that should not change',
                    authorUsername: 'originaluser',
                    authorName: 'Original User Name',
                    createdAt: '2024-01-10T08:30:00Z',
                    likeCount: 999,
                    retweetCount: 888,
                    replyCount: 777,
                },
            ],
        };

        writeFileSync(testInputFile, JSON.stringify(mockExportData, null, 2), 'utf-8');

        // Mock LLM
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: 'test-category',
                        },
                    },
                ],
            }),
        });

        const llmConfig: LLMConfig = {
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-api-key',
            prompt: 'Categorize',
            maxCategories: 3,
        };

        const categorizer = new LLMCategorizer(llmConfig);

        const analysisEngine = new AnalysisEngine({
            analyzers: [categorizer],
            scoringMethod: 'none',
        });

        const exportData = await analysisEngine.readExportFile(testInputFile);
        const analysisResult = await analysisEngine.analyzeExport(exportData);

        const enrichedBookmark = analysisResult.bookmarks[0];

        // Verify all original fields are unchanged
        expect(enrichedBookmark.id).toBe('original-id-123');
        expect(enrichedBookmark.url).toBe('https://twitter.com/original/status/123');
        expect(enrichedBookmark.text).toBe('Original text content that should not change');
        expect(enrichedBookmark.authorUsername).toBe('originaluser');
        expect(enrichedBookmark.authorName).toBe('Original User Name');
        expect(enrichedBookmark.createdAt).toBe('2024-01-10T08:30:00Z');
        expect(enrichedBookmark.likeCount).toBe(999);
        expect(enrichedBookmark.retweetCount).toBe(888);
        expect(enrichedBookmark.replyCount).toBe(777);

        // Verify analysis fields were added
        expect(enrichedBookmark.categories).toBeDefined();
        expect(enrichedBookmark.categories).toContain('test-category');
    });
});
