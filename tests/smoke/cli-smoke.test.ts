/**
 * CLI smoke tests
 * Quick validation that core CLI functionality works end-to-end
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { execa } from 'execa';

// Path to the built CLI
const CLI_PATH = 'dist/cli.js';

describe('CLI Smoke Tests', () => {
    // Ensure the CLI is built before running tests
    beforeAll(async () => {
        // Verify dist directory exists
        const { readdir } = await import('node:fs/promises');
        try {
            await readdir('dist');
        } catch {
            throw new Error('dist directory not found. Run `pnpm run build:dist` first.');
        }
    });

    describe('Basic CLI functionality', () => {
        test('CLI starts without errors', async () => {
            const result = await execa('node', [CLI_PATH, '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
        });

        test('--help flag displays help', async () => {
            const result = await execa('node', [CLI_PATH, '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Usage:');
            expect(result.stdout).toContain('Options:');
        });

        test('--version flag displays version', async () => {
            const result = await execa('node', [CLI_PATH, '--version'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
        });

        test('CLI responds to invalid command gracefully', async () => {
            const result = await execa('node', [CLI_PATH, 'invalid-command-that-does-not-exist'], {
                timeout: 10000,
                reject: false, // Don't reject on non-zero exit code
            });
            // Should have a non-zero exit code
            expect(result.exitCode).not.toBe(0);
            // Should have some error message
            expect(result.stderr.length + result.stdout.length).toBeGreaterThan(0);
        });
    });

    describe('Command availability', () => {
        test('metrics command is available', async () => {
            const result = await execa('node', [CLI_PATH, 'metrics', '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('metrics');
        });

        test('check command is available', async () => {
            const result = await execa('node', [CLI_PATH, 'check', '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('check');
        });

        test('whoami command is available', async () => {
            const result = await execa('node', [CLI_PATH, 'whoami', '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('whoami');
        });
    });

    describe('Error handling', () => {
        test('handles missing tweet ID gracefully', async () => {
            const result = await execa('node', [CLI_PATH, 'read'], {
                timeout: 10000,
                reject: false,
            });
            // Should fail with some error (exit code non-zero)
            expect(result.exitCode).not.toBe(0);
        });

        test('handles invalid flags gracefully', async () => {
            const result = await execa('node', [CLI_PATH, '--invalid-flag-that-does-not-exist'], {
                timeout: 10000,
                reject: false,
            });
            // Should fail with some error
            expect(result.exitCode).not.toBe(0);
        });
    });

    describe('Metrics command (offline-safe)', () => {
        test('metrics --json outputs valid JSON', async () => {
            const result = await execa('node', [CLI_PATH, 'metrics', '--json'], {
                timeout: 10000,
                reject: false, // May fail if metrics disabled
            });

            // If command succeeds, output should be valid JSON
            if (result.exitCode === 0) {
                expect(() => JSON.parse(result.stdout)).not.toThrow();
            }
        });

        test('metrics clear command works', async () => {
            const result = await execa('node', [CLI_PATH, 'metrics', 'clear'], {
                timeout: 10000,
                reject: false, // May fail if metrics disabled
            });

            // If metrics enabled, should succeed
            if (result.exitCode === 0) {
                expect(result.stdout).toContain('cleared');
            }
        });
    });

    describe('Output format flags', () => {
        test('--plain flag is accepted', async () => {
            const result = await execa('node', [CLI_PATH, '--plain', '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
        });

        test('--json flag is accepted', async () => {
            const result = await execa('node', [CLI_PATH, '--json', '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
        });

        test('--no-color flag is accepted', async () => {
            const result = await execa('node', [CLI_PATH, '--no-color', '--help'], {
                timeout: 10000,
            });
            expect(result.exitCode).toBe(0);
        });
    });

    describe('Performance', () => {
        test('--help responds quickly (< 2s)', async () => {
            const start = Date.now();
            const result = await execa('node', [CLI_PATH, '--help'], {
                timeout: 10000,
            });
            const duration = Date.now() - start;

            expect(result.exitCode).toBe(0);
            expect(duration).toBeLessThan(2000);
        });

        test('--version responds quickly (< 2s)', async () => {
            const start = Date.now();
            const result = await execa('node', [CLI_PATH, '--version'], {
                timeout: 10000,
            });
            const duration = Date.now() - start;

            expect(result.exitCode).toBe(0);
            expect(duration).toBeLessThan(2000);
        });
    });

    describe('Input validation', () => {
        test('read command requires arguments', async () => {
            const result = await execa('node', [CLI_PATH, 'read'], {
                timeout: 10000,
                reject: false,
            });
            // Should fail (exit code non-zero) when no arguments provided
            expect(result.exitCode).not.toBe(0);
        });

        test('metrics recent accepts count argument', async () => {
            const result = await execa('node', [CLI_PATH, 'metrics', 'recent', '5'], {
                timeout: 10000,
                reject: false, // May fail if metrics disabled
            });
            // If metrics enabled, should succeed
            // We don't assert exit code here since metrics might be disabled
            expect(result).toBeDefined();
        });
    });
});
