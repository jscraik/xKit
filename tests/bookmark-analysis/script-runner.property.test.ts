/**
 * Property-based tests for ScriptRunner
 * Feature: bookmark-export-analysis
 */

import * as fc from 'fast-check';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ScriptRunner } from '../../src/bookmark-analysis/script-runner.js';
import type { BookmarkRecord } from '../../src/bookmark-export/types.js';

// Arbitrary generators for property-based testing

// Generate valid ISO 8601 date-time strings within a reasonable range
const arbitraryISODateTime = (): fc.Arbitrary<string> => {
  // Generate timestamps between 2000-01-01 and 2030-12-31
  const minTimestamp = new Date('2000-01-01').getTime();
  const maxTimestamp = new Date('2030-12-31').getTime();
  return fc.integer({ min: minTimestamp, max: maxTimestamp })
    .map(timestamp => new Date(timestamp).toISOString());
};

const arbitraryBookmarkRecord = (): fc.Arbitrary<BookmarkRecord> => {
  return fc.record({
    id: fc.string({ minLength: 1 }),
    url: fc.webUrl(),
    text: fc.string(),
    authorUsername: fc.string({ minLength: 1 }),
    authorName: fc.string({ minLength: 1 }),
    createdAt: arbitraryISODateTime(),
    likeCount: fc.nat(),
    retweetCount: fc.nat(),
    replyCount: fc.nat(),
  });
};

describe('ScriptRunner - Property-Based Tests', () => {
  let tempDir: string;
  let echoScriptPath: string;
  let jsonValidatorScriptPath: string;

  beforeEach(async () => {
    // Create a temporary directory for test scripts
    tempDir = await fs.mkdtemp('script-runner-property-test-');

    // Create reusable script files
    echoScriptPath = path.join(tempDir, 'echo-script.js');
    const echoScriptContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(inputData);
    const output = {
      receivedInput: input
    };
    console.log(JSON.stringify(output));
  } catch (error) {
    console.error('Failed to parse input:', error.message);
    process.exit(1);
  }
});
        `;
    await fs.writeFile(echoScriptPath, echoScriptContent);

    jsonValidatorScriptPath = path.join(tempDir, 'json-validator.js');
    const jsonValidatorContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(inputData);
    const output = {
      jsonValid: true,
      inputType: typeof input
    };
    console.log(JSON.stringify(output));
  } catch (error) {
    const output = {
      jsonValid: false,
      error: error.message
    };
    console.log(JSON.stringify(output));
  }
});
        `;
    await fs.writeFile(jsonValidatorScriptPath, jsonValidatorContent);
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Property 14: Script execution with correct input
   * For any valid custom analysis script, it should be executed with the complete exported bookmark JSON as input
   * **Validates: Requirements 6.2**
   */
  it('Property 14: should execute script with complete bookmark record as input', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBookmarkRecord(),
        async (bookmark) => {
          const runner = new ScriptRunner();
          await runner.loadScript(echoScriptPath);
          const result = await runner.execute(bookmark);

          // Verify the script received the complete bookmark record
          expect(result).toHaveProperty('receivedInput');
          const receivedInput = result.receivedInput as BookmarkRecord;

          // All required fields should be present and match
          expect(receivedInput.id).toBe(bookmark.id);
          expect(receivedInput.url).toBe(bookmark.url);
          expect(receivedInput.text).toBe(bookmark.text);
          expect(receivedInput.authorUsername).toBe(bookmark.authorUsername);
          expect(receivedInput.authorName).toBe(bookmark.authorName);
          expect(receivedInput.createdAt).toBe(bookmark.createdAt);
          expect(receivedInput.likeCount).toBe(bookmark.likeCount);
          expect(receivedInput.retweetCount).toBe(bookmark.retweetCount);
          expect(receivedInput.replyCount).toBe(bookmark.replyCount);

          // The input should be a complete JSON object (no missing fields)
          const expectedKeys = ['id', 'url', 'text', 'authorUsername', 'authorName', 'createdAt', 'likeCount', 'retweetCount', 'replyCount'];
          for (const key of expectedKeys) {
            expect(receivedInput).toHaveProperty(key);
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 30000); // 30 second timeout for property-based test

  /**
   * Property: Script should receive valid JSON
   * For any bookmark, the script should receive parseable JSON input
   */
  it('should provide valid JSON input to scripts', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryBookmarkRecord(),
        async (bookmark) => {
          const runner = new ScriptRunner();
          await runner.loadScript(jsonValidatorScriptPath);
          const result = await runner.execute(bookmark);

          // Script should have successfully parsed the JSON
          expect(result.jsonValid).toBe(true);
          expect(result.inputType).toBe('object');
        }
      ),
      { numRuns: 100 }
    );
  }, 30000);

  /**
   * Property 16: Script output validation
   * For any script output, it should be validated against the expected schema before merging,
   * and invalid output should be rejected
   * **Validates: Requirements 6.5**
   */
  it('Property 16: should validate script output and reject invalid output', async () => {
    // Test with valid outputs
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          categories: fc.option(fc.array(fc.string(), { minLength: 0, maxLength: 5 }), { nil: undefined }),
          usefulnessScore: fc.option(fc.integer({ min: 0, max: 100 }), { nil: undefined }),
          customFields: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
        }),
        async (validOutput) => {
          const runner = new ScriptRunner();

          // Create a script that outputs the valid output
          const validScriptPath = path.join(tempDir, `valid-output-${Math.random()}.js`);
          const validScriptContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  const output = ${JSON.stringify(validOutput)};
  console.log(JSON.stringify(output));
});
                    `;
          await fs.writeFile(validScriptPath, validScriptContent);

          await runner.loadScript(validScriptPath);
          const bookmark = {
            id: '1',
            url: 'https://example.com',
            text: 'test',
            authorUsername: 'user',
            authorName: 'User',
            createdAt: '2024-01-01T00:00:00Z',
            likeCount: 0,
            retweetCount: 0,
            replyCount: 0,
          };

          const result = await runner.execute(bookmark);

          // Valid output should be accepted
          expect(runner.validate(result)).toBe(true);

          // Clean up
          await fs.unlink(validScriptPath);
        }
      ),
      { numRuns: 50 }
    );

    // Test with invalid outputs
    const invalidOutputs = [
      { value: null, description: 'null output' },
      { value: 'string', description: 'string output' },
      { value: 123, description: 'number output' },
      { value: true, description: 'boolean output' },
      { value: { categories: 'not-an-array' }, description: 'categories as string' },
      { value: { categories: [1, 2, 3] }, description: 'categories with non-string values' },
      { value: { usefulnessScore: 'not-a-number' }, description: 'usefulnessScore as string' },
      { value: { usefulnessScore: -1 }, description: 'usefulnessScore below 0' },
      { value: { usefulnessScore: 101 }, description: 'usefulnessScore above 100' },
      { value: { customFields: 'not-an-object' }, description: 'customFields as string' },
      { value: { customFields: null }, description: 'customFields as null' },
    ];

    for (const { value, description } of invalidOutputs) {
      const runner = new ScriptRunner();

      // Create a script that outputs the invalid output
      const invalidScriptPath = path.join(tempDir, `invalid-output-${Math.random()}.js`);
      const invalidScriptContent = `
let inputData = '';
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
  const output = ${JSON.stringify(value)};
  console.log(JSON.stringify(output));
});
            `;
      await fs.writeFile(invalidScriptPath, invalidScriptContent);

      await runner.loadScript(invalidScriptPath);
      const bookmark = {
        id: '1',
        url: 'https://example.com',
        text: 'test',
        authorUsername: 'user',
        authorName: 'User',
        createdAt: '2024-01-01T00:00:00Z',
        likeCount: 0,
        retweetCount: 0,
        replyCount: 0,
      };

      const result = await runner.execute(bookmark);

      // Invalid output should be rejected
      expect(runner.validate(result)).toBe(false);

      // Clean up
      await fs.unlink(invalidScriptPath);
    }
  }, 60000); // 60 second timeout for this comprehensive test
});
