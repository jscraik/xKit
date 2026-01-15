/**
 * Unit tests for ProgressReporter class
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressReporter } from '../../src/bookmark-export/progress-reporter.js';

describe('ProgressReporter', () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        // Spy on console.log to capture output
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.useFakeTimers();
    });

    afterEach(() => {
        consoleLogSpy.mockRestore();
        vi.useRealTimers();
    });

    describe('constructor', () => {
        it('should initialize with provided options', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 2000,
                displayProgress: true,
            });

            expect(reporter.getTotal()).toBe(100);
            expect(reporter.getProcessed()).toBe(0);
        });

        it('should use default update interval if not provided', () => {
            const reporter = new ProgressReporter({
                total: 100,
            });

            expect(reporter.getTotal()).toBe(100);
        });

        it('should use default displayProgress if not provided', () => {
            const reporter = new ProgressReporter({
                total: 100,
            });

            // Should display progress by default
            reporter.increment();
            vi.advanceTimersByTime(1000);
            reporter.increment();

            // Progress should be displayed (console.log called)
            expect(consoleLogSpy).toHaveBeenCalled();
        });
    });

    describe('increment', () => {
        it('should increment processed count', () => {
            const reporter = new ProgressReporter({ total: 100 });

            expect(reporter.getProcessed()).toBe(0);

            reporter.increment();
            expect(reporter.getProcessed()).toBe(1);

            reporter.increment();
            expect(reporter.getProcessed()).toBe(2);
        });

        it('should emit progress update at regular intervals', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 1000,
            });

            // First increment - should emit immediately (first update)
            reporter.increment();
            vi.advanceTimersByTime(1000);

            // Second increment after interval - should emit
            reporter.increment();

            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleLogSpy.mock.calls[0][0]).toContain('Progress:');
        });

        it('should not emit progress update before interval passes', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 1000,
            });

            // First increment will trigger update (lastUpdateTime is 0)
            reporter.increment();
            consoleLogSpy.mockClear(); // Clear the first call

            vi.advanceTimersByTime(500); // Only half the interval

            reporter.increment();

            // Should not have emitted progress since the clear
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should not display progress when displayProgress is false', () => {
            const reporter = new ProgressReporter({
                total: 100,
                displayProgress: false,
            });

            reporter.increment();
            vi.advanceTimersByTime(1000);
            reporter.increment();

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe('setProcessed', () => {
        it('should set processed count directly', () => {
            const reporter = new ProgressReporter({ total: 100 });

            reporter.setProcessed(50);
            expect(reporter.getProcessed()).toBe(50);

            reporter.setProcessed(75);
            expect(reporter.getProcessed()).toBe(75);
        });
    });

    describe('forceUpdate', () => {
        it('should emit progress update regardless of interval', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 10000, // Very long interval
            });

            reporter.increment();
            reporter.forceUpdate();

            expect(consoleLogSpy).toHaveBeenCalled();
            expect(consoleLogSpy.mock.calls[0][0]).toContain('Progress:');
        });

        it('should not display when displayProgress is false', () => {
            const reporter = new ProgressReporter({
                total: 100,
                displayProgress: false,
            });

            reporter.increment();
            reporter.forceUpdate();

            expect(consoleLogSpy).not.toHaveBeenCalled();
        });
    });

    describe('displayCompletionSummary', () => {
        it('should display completion summary with total, duration, and file location', () => {
            const reporter = new ProgressReporter({ total: 100 });

            reporter.setProcessed(100);
            vi.advanceTimersByTime(5000); // 5 seconds

            const summary = reporter.displayCompletionSummary('/path/to/output.json');

            expect(summary.total).toBe(100);
            expect(summary.duration).toBe(5000);
            expect(summary.fileLocation).toBe('/path/to/output.json');

            // Verify console output
            expect(consoleLogSpy).toHaveBeenCalled();
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Export Complete');
            expect(output).toContain('Total items processed: 100');
            expect(output).toContain('Duration: 5s');
            expect(output).toContain('Output file: /path/to/output.json');
        });

        it('should not display when displayProgress is false', () => {
            const reporter = new ProgressReporter({
                total: 100,
                displayProgress: false,
            });

            reporter.setProcessed(100);
            const summary = reporter.displayCompletionSummary('/path/to/output.json');

            // Summary should still be returned
            expect(summary.total).toBe(100);
            expect(summary.fileLocation).toBe('/path/to/output.json');

            // But nothing should be logged
            expect(consoleLogSpy).not.toHaveBeenCalled();
        });

        it('should format duration correctly for different time ranges', () => {
            const reporter = new ProgressReporter({ total: 100 });

            // Test milliseconds
            vi.advanceTimersByTime(500);
            let summary = reporter.displayCompletionSummary('/path/to/output.json');
            let output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('500ms');

            // Reset and test seconds
            consoleLogSpy.mockClear();
            reporter.reset();
            vi.advanceTimersByTime(30000); // 30 seconds
            summary = reporter.displayCompletionSummary('/path/to/output.json');
            output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('30s');

            // Reset and test minutes
            consoleLogSpy.mockClear();
            reporter.reset();
            vi.advanceTimersByTime(150000); // 2 minutes 30 seconds
            summary = reporter.displayCompletionSummary('/path/to/output.json');
            output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('2m 30s');

            // Reset and test hours
            consoleLogSpy.mockClear();
            reporter.reset();
            vi.advanceTimersByTime(7200000); // 2 hours
            summary = reporter.displayCompletionSummary('/path/to/output.json');
            output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('2h 0m');
        });
    });

    describe('progress message formatting', () => {
        it('should display processed count and percentage', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 1000,
            });

            reporter.setProcessed(50);
            vi.advanceTimersByTime(1000);
            reporter.forceUpdate();

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('50/100');
            expect(output).toContain('(50%)');
        });

        it('should display estimated time remaining', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 1000,
            });

            // Process 50 items in 5 seconds
            vi.advanceTimersByTime(5000);
            reporter.setProcessed(50);
            reporter.forceUpdate();

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('Estimated time remaining:');
            // Should estimate ~5 more seconds for remaining 50 items
            expect(output).toContain('5s');
        });

        it('should handle zero total gracefully', () => {
            const reporter = new ProgressReporter({
                total: 0,
                updateInterval: 1000,
            });

            reporter.forceUpdate();

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('0/0');
            expect(output).toContain('(0%)');
        });
    });

    describe('reset', () => {
        it('should reset processed count and start time', () => {
            const reporter = new ProgressReporter({ total: 100 });

            reporter.setProcessed(50);
            vi.advanceTimersByTime(5000);

            reporter.reset();

            expect(reporter.getProcessed()).toBe(0);
            expect(reporter.getTotal()).toBe(100);
        });

        it('should allow updating total on reset', () => {
            const reporter = new ProgressReporter({ total: 100 });

            reporter.setProcessed(50);
            reporter.reset(200);

            expect(reporter.getProcessed()).toBe(0);
            expect(reporter.getTotal()).toBe(200);
        });

        it('should not change total if not provided', () => {
            const reporter = new ProgressReporter({ total: 100 });

            reporter.setProcessed(50);
            reporter.reset();

            expect(reporter.getTotal()).toBe(100);
        });
    });

    describe('edge cases', () => {
        it('should handle processing more items than total', () => {
            const reporter = new ProgressReporter({ total: 10 });

            for (let i = 0; i < 15; i++) {
                reporter.increment();
            }

            expect(reporter.getProcessed()).toBe(15);

            // Clear any previous calls from increment
            consoleLogSpy.mockClear();
            reporter.forceUpdate();
            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('15/10');
        });

        it('should handle very fast processing (< 1ms per item)', () => {
            const reporter = new ProgressReporter({
                total: 1000,
                updateInterval: 100,
            });

            // Process items very quickly
            for (let i = 0; i < 500; i++) {
                reporter.increment();
            }

            vi.advanceTimersByTime(10); // Only 10ms elapsed

            // Clear any previous calls from increment
            consoleLogSpy.mockClear();
            reporter.forceUpdate();

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('500/1000');
            expect(output).toContain('Estimated time remaining:');
        });

        it('should handle zero processed items', () => {
            const reporter = new ProgressReporter({ total: 100 });

            reporter.forceUpdate();

            const output = consoleLogSpy.mock.calls[0][0];
            expect(output).toContain('0/100');
            expect(output).toContain('(0%)');
        });
    });

    describe('requirements validation', () => {
        it('should validate Requirement 9.1: Output progress updates at regular intervals', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 1000,
            });

            // Process items and advance time
            for (let i = 0; i < 10; i++) {
                reporter.increment();
                vi.advanceTimersByTime(1000);
            }

            // Should have emitted multiple progress updates
            expect(consoleLogSpy.mock.calls.length).toBeGreaterThan(0);
        });

        it('should validate Requirement 9.2: Display processed count and estimated time remaining', () => {
            const reporter = new ProgressReporter({
                total: 100,
                updateInterval: 1000,
            });

            reporter.setProcessed(25);
            vi.advanceTimersByTime(5000);
            reporter.forceUpdate();

            const output = consoleLogSpy.mock.calls[0][0];

            // Should contain processed count
            expect(output).toContain('25/100');

            // Should contain estimated time remaining
            expect(output).toContain('Estimated time remaining:');
        });

        it('should validate Requirement 9.3: Display completion summary with total, duration, file location', () => {
            const reporter = new ProgressReporter({ total: 50 });

            reporter.setProcessed(50);
            vi.advanceTimersByTime(10000);

            const summary = reporter.displayCompletionSummary('/exports/bookmarks_export.json');

            // Should return summary with all required fields
            expect(summary.total).toBe(50);
            expect(summary.duration).toBe(10000);
            expect(summary.fileLocation).toBe('/exports/bookmarks_export.json');

            // Should display summary
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Total items processed: 50');
            expect(output).toContain('Duration:');
            expect(output).toContain('Output file: /exports/bookmarks_export.json');
        });

        it('should validate Requirement 2.4: Log the total number of bookmarks exported', () => {
            const reporter = new ProgressReporter({ total: 150 });

            reporter.setProcessed(150);
            const summary = reporter.displayCompletionSummary('/exports/bookmarks.json');

            // Summary should include total count
            expect(summary.total).toBe(150);

            // Should be displayed in completion summary
            const output = consoleLogSpy.mock.calls.join('\n');
            expect(output).toContain('Total items processed: 150');
        });
    });
});
