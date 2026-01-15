/**
 * Property-based tests for ProgressReporter
 * Feature: bookmark-export-analysis
 */

import * as fc from 'fast-check';
import { beforeEach, describe, it, vi } from 'vitest';
import { ProgressReporter } from '../../src/bookmark-export/progress-reporter.js';

describe('ProgressReporter Property Tests', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    vi.useRealTimers();
  });

  /**
   * Property 21: Progress reporting
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any export or analysis operation processing more than 10 bookmarks,
   * progress updates should be emitted showing the count of processed bookmarks
   */
  it('Property 21: progress updates are emitted for operations with >10 items', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate total between 11 and 1000
        fc.integer({ min: 11, max: 1000 }),
        // Generate update interval between 100ms and 2000ms
        fc.integer({ min: 100, max: 2000 }),
        async (total, updateInterval) => {
          consoleLogSpy.mockClear();

          const reporter = new ProgressReporter({
            total,
            updateInterval,
            displayProgress: true,
          });

          // Process all items with time advancement
          for (let i = 0; i < total; i++) {
            reporter.increment();
            // Advance time to trigger updates periodically
            if (i % 10 === 0) {
              vi.advanceTimersByTime(updateInterval);
            }
          }

          // Force a final update to ensure we capture the state
          reporter.forceUpdate();

          // Should have emitted at least one progress update
          if (consoleLogSpy.mock.calls.length === 0) {
            return false;
          }

          // Verify that progress messages contain processed count
          const progressMessages = consoleLogSpy.mock.calls
            .map((call) => call[0])
            .filter((msg) => typeof msg === 'string' && msg.includes('Progress:'));

          if (progressMessages.length === 0) {
            return false;
          }

          // Verify at least one message shows processed count
          const hasProcessedCount = progressMessages.some((msg) => /\d+\/\d+/.test(msg));

          return hasProcessedCount;
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 22: Completion summary
   * **Validates: Requirements 2.4, 9.3**
   *
   * For any completed operation, a summary should be displayed containing
   * total items processed, duration, and output file location
   */
  it('Property 22: completion summary contains all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate total between 1 and 1000
        fc.integer({ min: 1, max: 1000 }),
        // Generate a file path
        fc
          .string({ minLength: 1 })
          .map((s) => `/exports/bookmarks_${s}.json`),
        // Generate duration in milliseconds
        fc.integer({ min: 100, max: 60000 }),
        async (total, filePath, duration) => {
          consoleLogSpy.mockClear();

          const reporter = new ProgressReporter({
            total,
            displayProgress: true,
          });

          // Set processed to total
          reporter.setProcessed(total);

          // Advance time to simulate duration
          vi.advanceTimersByTime(duration);

          // Display completion summary
          const summary = reporter.displayCompletionSummary(filePath);

          // Verify summary object has all required fields
          const hasTotal = 'total' in summary && summary.total === total;
          const hasDuration = 'duration' in summary && summary.duration === duration;
          const hasFileLocation = 'fileLocation' in summary && summary.fileLocation === filePath;

          if (!hasTotal || !hasDuration || !hasFileLocation) {
            return false;
          }

          // Verify console output contains all required information
          const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

          const containsTotal = output.includes(`Total items processed: ${total}`);
          const containsDuration = output.includes('Duration:');
          const containsFileLocation = output.includes(`Output file: ${filePath}`);

          return containsTotal && containsDuration && containsFileLocation;
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Additional property: Progress percentage accuracy
   *
   * For any processed count and total, the percentage should be
   * calculated correctly and be between 0 and 100 (or higher if
   * processed exceeds total)
   */
  it('Property: progress percentage is calculated correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 1500 }),
        async (total, processed) => {
          consoleLogSpy.mockClear();

          const reporter = new ProgressReporter({
            total,
            displayProgress: true,
          });

          reporter.setProcessed(processed);
          reporter.forceUpdate();

          const output = consoleLogSpy.mock.calls[0]?.[0];
          if (!output || typeof output !== 'string') {
            return false;
          }

          // Extract percentage from output
          const percentageMatch = output.match(/\((\d+)%\)/);
          if (!percentageMatch) {
            return false;
          }

          const displayedPercentage = Number.parseInt(percentageMatch[1], 10);
          const expectedPercentage = Math.round((processed / total) * 100);

          return displayedPercentage === expectedPercentage;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Duration formatting consistency
   *
   * For any duration, the formatted output should be consistent
   * and use appropriate units (ms, s, m, h)
   */
  it('Property: duration formatting uses appropriate units', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 1, max: 7200000 }), // Up to 2 hours
        async (total, duration) => {
          consoleLogSpy.mockClear();

          const reporter = new ProgressReporter({
            total,
            displayProgress: true,
          });

          reporter.setProcessed(total);
          vi.advanceTimersByTime(duration);

          reporter.displayCompletionSummary('/test/output.json');

          const output = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

          // Extract the duration line from the output
          const durationLine = output.split('\n').find((line) => line.includes('Duration:'));

          if (!durationLine) {
            return false;
          }

          // Verify duration is formatted with appropriate units
          if (duration < 1000) {
            return durationLine.includes('ms') && !durationLine.match(/\d+s/);
          }
          if (duration < 60000) {
            return durationLine.match(/\d+s/) !== null && !durationLine.includes('ms');
          }
          if (duration < 3600000) {
            return durationLine.includes('m') && durationLine.includes('s');
          }
          return durationLine.includes('h') && durationLine.includes('m');
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Additional property: Reset functionality
   *
   * For any reporter state, reset should restore it to initial state
   */
  it('Property: reset restores reporter to initial state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        async (initialTotal, processed, newTotal) => {
          const reporter = new ProgressReporter({
            total: initialTotal,
          });

          // Process some items
          reporter.setProcessed(processed);
          vi.advanceTimersByTime(5000);

          // Reset with new total
          reporter.reset(newTotal);

          // Verify state is reset
          const processedAfterReset = reporter.getProcessed();
          const totalAfterReset = reporter.getTotal();

          return processedAfterReset === 0 && totalAfterReset === newTotal;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Increment is monotonic
   *
   * For any sequence of increments, the processed count should
   * always increase monotonically
   */
  it('Property: processed count increases monotonically with increment', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async (incrementCount) => {
        const reporter = new ProgressReporter({
          total: incrementCount * 2,
        });

        let previousCount = 0;

        for (let i = 0; i < incrementCount; i++) {
          reporter.increment();
          const currentCount = reporter.getProcessed();

          // Current count should be exactly one more than previous
          if (currentCount !== previousCount + 1) {
            return false;
          }

          previousCount = currentCount;
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Additional property: Display toggle works correctly
   *
   * For any operation, when displayProgress is false, no console
   * output should be produced
   */
  it('Property: displayProgress=false prevents all console output', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1 }).map((s) => `/exports/${s}.json`),
        async (total, filePath) => {
          consoleLogSpy.mockClear();

          const reporter = new ProgressReporter({
            total,
            displayProgress: false,
          });

          // Perform various operations
          for (let i = 0; i < total; i++) {
            reporter.increment();
            if (i % 10 === 0) {
              vi.advanceTimersByTime(1000);
            }
          }

          reporter.forceUpdate();
          reporter.displayCompletionSummary(filePath);

          // No console output should have been produced
          return consoleLogSpy.mock.calls.length === 0;
        },
      ),
      { numRuns: 50 },
    );
  });
});
