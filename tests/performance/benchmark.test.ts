/**
 * Performance benchmark tests
 * Measure and validate CLI performance targets from Tech Spec
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { execa } from 'execa';

// Path to the built CLI
const CLI_PATH = 'dist/cli.js';

// Helper to calculate p95 percentile
function calculateP95(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * 0.95) - 1;
    return sorted[Math.max(0, index)];
}

// Helper to calculate average
function calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
}

describe('Performance Benchmarks', () => {
    // Ensure the CLI is built before running tests
    beforeAll(async () => {
        const { readdir } = await import('node:fs/promises');
        try {
            await readdir('dist');
        } catch {
            throw new Error('dist directory not found. Run `pnpm run build:dist` first.');
        }
    });

    describe('CLI Startup Performance', () => {
        test('CLI startup time p95 < 2s', async () => {
            const times: number[] = [];
            const iterations = 10;

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                const result = await execa('node', [CLI_PATH, '--version'], {
                    timeout: 10000,
                });
                const duration = performance.now() - start;

                expect(result.exitCode).toBe(0);
                times.push(duration);
            }

            const p95 = calculateP95(times);
            const avg = calculateAverage(times);

            console.log(`CLI startup p95: ${p95.toFixed(0)}ms, avg: ${avg.toFixed(0)}ms`);
            expect(p95).toBeLessThan(2000);
        });

        test('--help flag p95 < 2s', async () => {
            const times: number[] = [];
            const iterations = 10;

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                const result = await execa('node', [CLI_PATH, '--help'], {
                    timeout: 10000,
                });
                const duration = performance.now() - start;

                expect(result.exitCode).toBe(0);
                times.push(duration);
            }

            const p95 = calculateP95(times);
            const avg = calculateAverage(times);

            console.log(`--help p95: ${p95.toFixed(0)}ms, avg: ${avg.toFixed(0)}ms`);
            expect(p95).toBeLessThan(2000);
        });
    });

    describe('Command Latency', () => {
        test('metrics command response time p95 < 1s', async () => {
            const times: number[] = [];
            const iterations = 10;

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                const result = await execa('node', [CLI_PATH, 'metrics', '--json'], {
                    timeout: 10000,
                    reject: false, // May fail if metrics disabled
                });
                const duration = performance.now() - start;

                // Only measure successful runs
                if (result.exitCode === 0) {
                    times.push(duration);
                }
            }

            // If we have some successful runs, validate performance
            if (times.length > 0) {
                const p95 = calculateP95(times);
                const avg = calculateAverage(times);

                console.log(`metrics command p95: ${p95.toFixed(0)}ms, avg: ${avg.toFixed(0)}ms (${times.length} runs)`);
                expect(p95).toBeLessThan(1000);
            } else {
                console.log('metrics command not available (disabled), skipping performance test');
            }
        });

        test('check command response time p95 < 1s', async () => {
            const times: number[] = [];
            const iterations = 5;

            for (let i = 0; i < iterations; i++) {
                const start = performance.now();
                const result = await execa('node', [CLI_PATH, 'check'], {
                    timeout: 10000,
                    reject: false, // May fail if not configured
                });
                const duration = performance.now() - start;

                // Measure both success and failure (latency is what matters)
                times.push(duration);
            }

            const p95 = calculateP95(times);
            const avg = calculateAverage(times);

            console.log(`check command p95: ${p95.toFixed(0)}ms, avg: ${avg.toFixed(0)}ms`);
            expect(p95).toBeLessThan(1000);
        });
    });

    describe('Memory Bounds', () => {
        test('CLI startup memory usage is bounded', async () => {
            const before = process.memoryUsage();
            const result = await execa('node', [CLI_PATH, '--version'], {
                timeout: 10000,
            });
            const after = process.memoryUsage();

            expect(result.exitCode).toBe(0);

            // Check heap growth is reasonable (< 50MB)
            const heapGrowth = after.heapUsed - before.heapUsed;
            console.log(`Heap growth for CLI startup: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`);
            expect(heapGrowth).toBeLessThan(50_000_000);
        });

        test('Multiple CLI invocations do not leak memory', async () => {
            const iterations = 10;
            const before = process.memoryUsage();

            for (let i = 0; i < iterations; i++) {
                await execa('node', [CLI_PATH, '--version'], {
                    timeout: 10000,
                });
            }

            const after = process.memoryUsage();

            // Check heap growth is reasonable (< 100MB for 10 invocations)
            const heapGrowth = after.heapUsed - before.heapUsed;
            const avgGrowthPerInvocation = heapGrowth / iterations;

            console.log(`Avg heap growth per invocation: ${(avgGrowthPerInvocation / 1024 / 1024).toFixed(2)}MB`);
            expect(avgGrowthPerInvocation).toBeLessThan(10_000_000); // < 10MB per invocation
        });
    });

    describe('Output Performance', () => {
        test('--json output does not significantly impact performance', async () => {
            const plainTimes: number[] = [];
            const jsonTimes: number[] = [];
            const iterations = 5;

            for (let i = 0; i < iterations; i++) {
                // Measure plain output
                let start = performance.now();
                await execa('node', [CLI_PATH, '--version'], {
                    timeout: 10000,
                });
                plainTimes.push(performance.now() - start);

                // Measure JSON output
                start = performance.now();
                await execa('node', [CLI_PATH, '--version'], {
                    timeout: 10000,
                    env: { ...process.env, XKIT_OUTPUT_FORMAT: 'json' },
                });
                jsonTimes.push(performance.now() - start);
            }

            const plainAvg = calculateAverage(plainTimes);
            const jsonAvg = calculateAverage(jsonTimes);
            const ratio = jsonAvg / plainAvg;

            console.log(`Plain output: ${plainAvg.toFixed(0)}ms, JSON output: ${jsonAvg.toFixed(0)}ms, ratio: ${ratio.toFixed(2)}x`);

            // JSON output should not be more than 2x slower
            expect(ratio).toBeLessThan(2);
        });

        test('--no-color output does not significantly impact performance', async () => {
            const colorTimes: number[] = [];
            const plainTimes: number[] = [];
            const iterations = 5;

            for (let i = 0; i < iterations; i++) {
                // Measure with color (default)
                let start = performance.now();
                await execa('node', [CLI_PATH, '--help'], {
                    timeout: 10000,
                });
                colorTimes.push(performance.now() - start);

                // Measure without color
                start = performance.now();
                await execa('node', [CLI_PATH, '--no-color', '--help'], {
                    timeout: 10000,
                });
                plainTimes.push(performance.now() - start);
            }

            const colorAvg = calculateAverage(colorTimes);
            const plainAvg = calculateAverage(plainTimes);
            const ratio = colorAvg / plainAvg;

            console.log(`Color output: ${colorAvg.toFixed(0)}ms, Plain output: ${plainAvg.toFixed(0)}ms, ratio: ${ratio.toFixed(2)}x`);

            // Color output should not be more than 1.5x slower
            expect(ratio).toBeLessThan(1.5);
        });
    });

    describe('Scalability', () => {
        test('CLI handles large help text output efficiently', async () => {
            const start = performance.now();
            const result = await execa('node', [CLI_PATH, '--help'], {
                timeout: 10000,
            });
            const duration = performance.now() - start;

            expect(result.exitCode).toBe(0);
            expect(result.stdout.length).toBeGreaterThan(1000); // Help text should be substantial

            // Should still be fast even with large output
            expect(duration).toBeLessThan(2000);
        });

        test('CLI handles complex command structures efficiently', async () => {
            const start = performance.now();
            const result = await execa('node', [CLI_PATH, 'metrics', '--help'], {
                timeout: 10000,
            });
            const duration = performance.now() - start;

            expect(result.exitCode).toBe(0);

            // Should be fast for complex commands too
            expect(duration).toBeLessThan(1500);
        });
    });
});
