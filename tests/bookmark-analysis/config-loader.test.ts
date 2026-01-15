import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { AnalysisConfigLoader } from '../../src/bookmark-analysis/config-loader.js';

describe('AnalysisConfigLoader', () => {
    const testDir = 'analysis-config-loader-test';
    const configPath = join(testDir, '.bookmark-analysis.config.json');

    beforeEach(() => {
        mkdirSync(testDir, { recursive: true });
        // Clear environment variables
        delete process.env.LLM_API_KEY;
        delete process.env.LLM_PROVIDER;
        delete process.env.LLM_MODEL;
        delete process.env.ANALYSIS_OUTPUT_DIR;
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    describe('loadAnalysisConfig', () => {
        test('should load valid configuration from file', () => {
            const config = {
                llm: {
                    provider: 'anthropic',
                    model: 'claude-3',
                    apiKey: 'test-key',
                    categorization: {
                        enabled: true,
                        prompt: 'Custom prompt',
                        maxCategories: 5,
                    },
                },
                scoring: {
                    method: 'hybrid',
                    weights: {
                        engagement: 0.4,
                        recency: 0.3,
                        contentQuality: 0.3,
                    },
                },
                customScripts: ['./script1.js', './script2.py'],
                output: {
                    directory: './custom-analysis',
                    filenamePattern: 'custom_{method}_{timestamp}.json',
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            const loaded = AnalysisConfigLoader.loadAnalysisConfig(configPath);

            expect(loaded.llm.provider).toBe('anthropic');
            expect(loaded.llm.model).toBe('claude-3');
            expect(loaded.llm.apiKey).toBe('test-key');
            expect(loaded.llm.categorization.enabled).toBe(true);
            expect(loaded.llm.categorization.prompt).toBe('Custom prompt');
            expect(loaded.llm.categorization.maxCategories).toBe(5);
            expect(loaded.scoring.method).toBe('hybrid');
            expect(loaded.scoring.weights.engagement).toBe(0.4);
            expect(loaded.customScripts).toEqual(['./script1.js', './script2.py']);
            expect(loaded.output.directory).toBe('./custom-analysis');
        });

        test('should use default values when config file does not exist', () => {
            // Provide API key via environment to satisfy validation
            process.env.LLM_API_KEY = 'test-key';

            const loaded = AnalysisConfigLoader.loadAnalysisConfig('nonexistent.json');

            expect(loaded.llm.provider).toBe('openai');
            expect(loaded.llm.model).toBe('gpt-4');
            expect(loaded.llm.apiKey).toBe('test-key');
            expect(loaded.llm.categorization.enabled).toBe(true);
            expect(loaded.llm.categorization.maxCategories).toBe(3);
            expect(loaded.scoring.method).toBe('heuristic');
            expect(loaded.customScripts).toEqual([]);
            expect(loaded.output.directory).toBe('./analysis');
        });

        test('should override config file with environment variables', () => {
            const config = {
                llm: {
                    provider: 'openai',
                    model: 'gpt-3.5',
                    apiKey: 'file-key',
                    categorization: {
                        enabled: true,
                        prompt: 'File prompt',
                        maxCategories: 3,
                    },
                },
                output: {
                    directory: './file-analysis',
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            process.env.LLM_API_KEY = 'env-key';
            process.env.LLM_PROVIDER = 'anthropic';
            process.env.LLM_MODEL = 'claude-3';
            process.env.ANALYSIS_OUTPUT_DIR = './env-analysis';

            const loaded = AnalysisConfigLoader.loadAnalysisConfig(configPath);

            expect(loaded.llm.apiKey).toBe('env-key');
            expect(loaded.llm.provider).toBe('anthropic');
            expect(loaded.llm.model).toBe('claude-3');
            expect(loaded.output.directory).toBe('./env-analysis');
        });

        test('should throw error for missing API key when categorization is enabled', () => {
            const config = {
                llm: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: '',
                    categorization: {
                        enabled: true,
                        prompt: 'Test prompt',
                        maxCategories: 3,
                    },
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            expect(() => AnalysisConfigLoader.loadAnalysisConfig(configPath)).toThrow('LLM API key is required when categorization is enabled');
        });

        test('should throw error for missing API key when scoring method is llm', () => {
            const config = {
                llm: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: '',
                    categorization: {
                        enabled: false,
                        prompt: 'Test prompt',
                        maxCategories: 3,
                    },
                },
                scoring: {
                    method: 'llm',
                    weights: {
                        engagement: 0.3,
                        recency: 0.2,
                        contentQuality: 0.5,
                    },
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            expect(() => AnalysisConfigLoader.loadAnalysisConfig(configPath)).toThrow('LLM API key is required for LLM-based scoring');
        });

        test('should not require API key when categorization is disabled and scoring is heuristic', () => {
            const config = {
                llm: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: '',
                    categorization: {
                        enabled: false,
                        prompt: 'Test prompt',
                        maxCategories: 3,
                    },
                },
                scoring: {
                    method: 'heuristic',
                    weights: {
                        engagement: 0.3,
                        recency: 0.2,
                        contentQuality: 0.5,
                    },
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            const loaded = AnalysisConfigLoader.loadAnalysisConfig(configPath);

            expect(loaded.llm.apiKey).toBe('');
            expect(loaded.llm.categorization.enabled).toBe(false);
            expect(loaded.scoring.method).toBe('heuristic');
        });

        test('should throw error for invalid maxCategories', () => {
            const config = {
                llm: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: 'test-key',
                    categorization: {
                        enabled: true,
                        prompt: 'Test prompt',
                        maxCategories: 0,
                    },
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            expect(() => AnalysisConfigLoader.loadAnalysisConfig(configPath)).toThrow('maxCategories must be at least 1');
        });

        test('should throw error for invalid scoring method', () => {
            const config = {
                llm: {
                    provider: 'openai',
                    model: 'gpt-4',
                    apiKey: '',
                    categorization: {
                        enabled: false,
                        prompt: 'Test prompt',
                        maxCategories: 3,
                    },
                },
                scoring: {
                    method: 'invalid',
                    weights: {
                        engagement: 0.3,
                        recency: 0.2,
                        contentQuality: 0.5,
                    },
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            expect(() => AnalysisConfigLoader.loadAnalysisConfig(configPath)).toThrow('Invalid scoring method');
        });

        test('should throw error for invalid JSON in config file', () => {
            writeFileSync(configPath, 'invalid json {');

            expect(() => AnalysisConfigLoader.loadAnalysisConfig(configPath)).toThrow('Failed to load config');
        });

        test('should merge partial config with defaults', () => {
            const config = {
                llm: {
                    apiKey: 'test-key',
                },
            };

            writeFileSync(configPath, JSON.stringify(config, null, 2));

            const loaded = AnalysisConfigLoader.loadAnalysisConfig(configPath);

            expect(loaded.llm.apiKey).toBe('test-key');
            expect(loaded.llm.provider).toBe('openai');
            expect(loaded.llm.model).toBe('gpt-4');
            expect(loaded.scoring.method).toBe('heuristic');
            expect(loaded.output.directory).toBe('./analysis');
        });
    });
});
