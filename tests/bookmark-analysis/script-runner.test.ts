/**
 * Unit tests for ScriptRunner
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScriptRunner } from '../../src/bookmark-analysis/script-runner.js';
import type { BookmarkRecord } from '../../src/bookmark-export/types.js';

describe('ScriptRunner', () => {
    let tempDir: string;
    let sampleBookmark: BookmarkRecord;

    beforeEach(async () => {
        // Create a temporary directory for test scripts
        tempDir = await fs.mkdtemp('script-runner-test-');

        sampleBookmark = {
            id: '1',
            url: 'https://twitter.com/user/status/1',
            text: 'Test tweet about JavaScript',
            authorUsername: 'author',
            authorName: 'Author Name',
            createdAt: '2024-01-01T00:00:00.000Z',
            likeCount: 10,
            retweetCount: 5,
            replyCount: 2,
        };
    });

    afterEach(async () => {
        // Clean up temporary directory
        await fs.rm(tempDir, { recursive: true, force: true });
    });

    describe('loadScript', () => {
        it('should load a valid script file', async () => {
            const scriptPath = path.join(tempDir, 'test-script.js');
            await fs.writeFile(scriptPath, 'console.log("test");');

            const runner = new ScriptRunner();
            await expect(runner.loadScript(scriptPath)).resolves.not.toThrow();
        });

        it('should throw error for non-existent script file', async () => {
            const runner = new ScriptRunner();
            await expect(runner.loadScript('/nonexistent/script.js')).rejects.toThrow(
                'Script file not found'
            );
        });

        it('should throw error if path is not a file', async () => {
            const runner = new ScriptRunner();
            await expect(runner.loadScript(tempDir)).rejects.toThrow('Script path is not a file');
        });
    });

    describe('execute', () => {
        it('should execute a JavaScript script and return JSON output', async () => {
            const scriptPath = path.join(tempDir, 'test-script.js');
            const scriptContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  const input = JSON.parse(inputData);
  const output = {
    categories: ['tech', 'programming'],
    customFields: { language: 'javascript' }
  };
  console.log(JSON.stringify(output));
});
      `;
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.execute(sampleBookmark);

            expect(result).toEqual({
                categories: ['tech', 'programming'],
                customFields: { language: 'javascript' },
            });
        });

        it('should throw error if no script is loaded', async () => {
            const runner = new ScriptRunner();
            await expect(runner.execute(sampleBookmark)).rejects.toThrow('No script loaded');
        });

        it('should throw error if script exits with non-zero code', async () => {
            const scriptPath = path.join(tempDir, 'failing-script.js');
            const scriptContent = 'process.exit(1);';
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            await expect(runner.execute(sampleBookmark)).rejects.toThrow('Script exited with code 1');
        });

        it('should throw error if script output is not valid JSON', async () => {
            const scriptPath = path.join(tempDir, 'invalid-json-script.js');
            const scriptContent = 'console.log("not json");';
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            await expect(runner.execute(sampleBookmark)).rejects.toThrow(
                'Failed to parse script output as JSON'
            );
        });

        it('should timeout if script takes too long', async () => {
            const scriptPath = path.join(tempDir, 'slow-script.js');
            const scriptContent = `
setTimeout(() => {
  console.log(JSON.stringify({ categories: ['test'] }));
}, 5000);
      `;
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner({ timeout: 100 });
            await runner.loadScript(scriptPath);
            await expect(runner.execute(sampleBookmark)).rejects.toThrow('Script execution timed out');
        });

        it('should throw error if script output exceeds maximum size', async () => {
            const scriptPath = path.join(tempDir, 'large-output-script.js');
            const scriptContent = `
const largeString = 'x'.repeat(1000000);
console.log(JSON.stringify({ data: largeString }));
      `;
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner({ maxOutputSize: 1000 });
            await runner.loadScript(scriptPath);
            await expect(runner.execute(sampleBookmark)).rejects.toThrow(
                'Script output exceeded maximum size'
            );
        });
    });

    describe('validate', () => {
        it('should validate valid script output', () => {
            const runner = new ScriptRunner();
            const validOutput = {
                categories: ['tech', 'programming'],
                usefulnessScore: 85,
                customFields: { sentiment: 'positive' },
            };

            expect(runner.validate(validOutput)).toBe(true);
        });

        it('should reject non-object output', () => {
            const runner = new ScriptRunner();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(runner.validate('not an object')).toBe(false);
            expect(runner.validate(null)).toBe(false);
            expect(runner.validate(123)).toBe(false);

            consoleSpy.mockRestore();
        });

        it('should reject categories that are not an array', () => {
            const runner = new ScriptRunner();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const invalidOutput = {
                categories: 'not an array',
            };

            expect(runner.validate(invalidOutput)).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should reject categories with non-string values', () => {
            const runner = new ScriptRunner();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const invalidOutput = {
                categories: ['tech', 123, 'programming'],
            };

            expect(runner.validate(invalidOutput)).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should reject usefulnessScore that is not a number', () => {
            const runner = new ScriptRunner();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const invalidOutput = {
                usefulnessScore: 'not a number',
            };

            expect(runner.validate(invalidOutput)).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should reject usefulnessScore outside range [0, 100]', () => {
            const runner = new ScriptRunner();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(runner.validate({ usefulnessScore: -1 })).toBe(false);
            expect(runner.validate({ usefulnessScore: 101 })).toBe(false);

            consoleSpy.mockRestore();
        });

        it('should accept usefulnessScore within range [0, 100]', () => {
            const runner = new ScriptRunner();

            expect(runner.validate({ usefulnessScore: 0 })).toBe(true);
            expect(runner.validate({ usefulnessScore: 50 })).toBe(true);
            expect(runner.validate({ usefulnessScore: 100 })).toBe(true);
        });

        it('should reject customFields that are not an object', () => {
            const runner = new ScriptRunner();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const invalidOutput = {
                customFields: 'not an object',
            };

            expect(runner.validate(invalidOutput)).toBe(false);
            consoleSpy.mockRestore();
        });

        it('should accept empty object', () => {
            const runner = new ScriptRunner();
            expect(runner.validate({})).toBe(true);
        });
    });

    describe('analyze', () => {
        it('should analyze bookmark and return categories', async () => {
            const scriptPath = path.join(tempDir, 'categorize-script.js');
            const scriptContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  const input = JSON.parse(inputData);
  const output = {
    categories: ['tech', 'programming']
  };
  console.log(JSON.stringify(output));
});
      `;
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            expect(result.categories).toEqual(['tech', 'programming']);
        });

        it('should analyze bookmark and return usefulness score', async () => {
            const scriptPath = path.join(tempDir, 'score-script.js');
            const scriptContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  const input = JSON.parse(inputData);
  const output = {
    usefulnessScore: 85
  };
  console.log(JSON.stringify(output));
});
      `;
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            expect(result.usefulnessScore).toBe(85);
        });

        it('should analyze bookmark and return custom fields', async () => {
            const scriptPath = path.join(tempDir, 'custom-script.js');
            const scriptContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  const input = JSON.parse(inputData);
  const output = {
    sentiment: 'positive',
    domain: 'twitter.com',
    language: 'en'
  };
  console.log(JSON.stringify(output));
});
      `;
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            expect(result.customFields).toEqual({
                sentiment: 'positive',
                domain: 'twitter.com',
                language: 'en',
            });
        });

        it('should return empty result on script failure', async () => {
            const scriptPath = path.join(tempDir, 'failing-script.js');
            const scriptContent = 'process.exit(1);';
            await fs.writeFile(scriptPath, scriptContent);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            expect(result).toEqual({});
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Script execution failed'),
                expect.any(Error)
            );

            consoleSpy.mockRestore();
        });

        it('should return empty result on validation failure', async () => {
            const scriptPath = path.join(tempDir, 'invalid-output-script.js');
            const scriptContent = `
const output = {
  categories: 'not an array'
};
console.log(JSON.stringify(output));
      `;
            await fs.writeFile(scriptPath, scriptContent);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            expect(result).toEqual({});
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        });

        it('should throw error if no script is loaded', async () => {
            const runner = new ScriptRunner();
            await expect(runner.analyze(sampleBookmark)).rejects.toThrow('No script loaded');
        });
    });

    describe('interpreter detection', () => {
        it('should use node for .js files', async () => {
            const scriptPath = path.join(tempDir, 'test.js');
            const scriptContent = 'console.log(JSON.stringify({}));';
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.execute(sampleBookmark);

            expect(result).toEqual({});
        });

        it('should use node for .mjs files', async () => {
            const scriptPath = path.join(tempDir, 'test.mjs');
            const scriptContent = 'console.log(JSON.stringify({}));';
            await fs.writeFile(scriptPath, scriptContent);

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.execute(sampleBookmark);

            expect(result).toEqual({});
        });

        it('should throw error for unsupported file extension', async () => {
            const scriptPath = path.join(tempDir, 'test.txt');
            await fs.writeFile(scriptPath, 'test');

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            await expect(runner.execute(sampleBookmark)).rejects.toThrow(
                'Unsupported script extension'
            );
        });
    });

    describe('error logging on script failure', () => {
        /**
         * Test error logging on script execution failure
         * Validates: Requirement 6.4 - IF the script fails, THEN THE Analysis_Engine SHALL log the error
         * and continue with remaining analysis tasks
         */
        it('should log error with context when script execution fails', async () => {
            const scriptPath = path.join(tempDir, 'failing-script-error-log.js');
            const scriptContent = `
console.error('Script internal error');
process.exit(1);
            `;
            await fs.writeFile(scriptPath, scriptContent);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            // Should return empty result (continue processing)
            expect(result).toEqual({});

            // Get all console.error calls
            const calls = consoleSpy.mock.calls;

            // Should log error with bookmark ID
            const errorCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script execution failed for bookmark ${sampleBookmark.id}`)
            );
            expect(errorCall).toBeDefined();
            expect(errorCall![1]).toBeInstanceOf(Error);

            // Should log script path for debugging
            const pathCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script path:`) && call[0].includes(scriptPath)
            );
            expect(pathCall).toBeDefined();

            consoleSpy.mockRestore();
        });

        it('should log error with context when script times out', async () => {
            const scriptPath = path.join(tempDir, 'timeout-script-error-log.js');
            const scriptContent = `
// Script that never completes
setInterval(() => {}, 1000);
            `;
            await fs.writeFile(scriptPath, scriptContent);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const runner = new ScriptRunner({ timeout: 100 });
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            // Should return empty result (continue processing)
            expect(result).toEqual({});

            // Get all console.error calls
            const calls = consoleSpy.mock.calls;

            // Should log error with bookmark ID
            const errorCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script execution failed for bookmark ${sampleBookmark.id}`)
            );
            expect(errorCall).toBeDefined();
            expect(errorCall![1]).toBeInstanceOf(Error);

            // Error should mention timeout
            expect((errorCall![1] as Error).message).toContain('timed out');

            // Should log script path
            const pathCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script path:`) && call[0].includes(scriptPath)
            );
            expect(pathCall).toBeDefined();

            consoleSpy.mockRestore();
        });

        it('should log error with context when script output is invalid JSON', async () => {
            const scriptPath = path.join(tempDir, 'invalid-json-error-log.js');
            const scriptContent = `
console.log('This is not valid JSON');
            `;
            await fs.writeFile(scriptPath, scriptContent);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            // Should return empty result (continue processing)
            expect(result).toEqual({});

            // Get all console.error calls
            const calls = consoleSpy.mock.calls;

            // Should log error with bookmark ID
            const errorCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script execution failed for bookmark ${sampleBookmark.id}`)
            );
            expect(errorCall).toBeDefined();
            expect(errorCall![1]).toBeInstanceOf(Error);

            // Should log script path
            const pathCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script path:`) && call[0].includes(scriptPath)
            );
            expect(pathCall).toBeDefined();

            consoleSpy.mockRestore();
        });

        it('should log error with context when script output validation fails', async () => {
            const scriptPath = path.join(tempDir, 'invalid-validation-error-log.js');
            const scriptContent = `
const output = {
    categories: 'not an array',
    usefulnessScore: 150
};
console.log(JSON.stringify(output));
            `;
            await fs.writeFile(scriptPath, scriptContent);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);
            const result = await runner.analyze(sampleBookmark);

            // Should return empty result (continue processing)
            expect(result).toEqual({});

            // Get all console.error calls
            const calls = consoleSpy.mock.calls;

            // Should log validation errors
            const validationCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes('Script output validation failed')
            );
            expect(validationCall).toBeDefined();

            // Should log error with bookmark ID
            const errorCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script execution failed for bookmark ${sampleBookmark.id}`)
            );
            expect(errorCall).toBeDefined();
            expect(errorCall![1]).toBeInstanceOf(Error);

            // Should log script path
            const pathCall = calls.find(call =>
                typeof call[0] === 'string' && call[0].includes(`Script path:`) && call[0].includes(scriptPath)
            );
            expect(pathCall).toBeDefined();

            consoleSpy.mockRestore();
        });

        it('should continue processing after script failure (not throw)', async () => {
            const scriptPath = path.join(tempDir, 'failing-continue.js');
            const scriptContent = 'process.exit(1);';
            await fs.writeFile(scriptPath, scriptContent);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const runner = new ScriptRunner();
            await runner.loadScript(scriptPath);

            // Should not throw - should return empty result to allow continued processing
            await expect(runner.analyze(sampleBookmark)).resolves.toEqual({});

            consoleSpy.mockRestore();
        });
    });
});
