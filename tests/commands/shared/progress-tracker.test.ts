import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProgressTracker } from '../../../src/commands/shared/progress-tracker.js';

describe('ProgressTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with total and label', () => {
    const tracker = new ProgressTracker(100, 'Processing');
    expect(tracker.getProgress()).toBe(0);
  });

  it('increments progress correctly', () => {
    const tracker = new ProgressTracker(10, 'Test');
    tracker.increment();
    expect(tracker.getProgress()).toBe(0.1);
    tracker.increment();
    expect(tracker.getProgress()).toBe(0.2);
  });

  it('completes progress when reaching total', () => {
    const tracker = new ProgressTracker(5, 'Test');
    for (let i = 0; i < 5; i++) {
      tracker.increment();
    }
    expect(tracker.getProgress()).toBe(1);
  });

  it('manually sets progress to complete', () => {
    const tracker = new ProgressTracker(100, 'Test');
    tracker.complete();
    expect(tracker.getProgress()).toBe(1);
  });

  it('calculates elapsed time', () => {
    const tracker = new ProgressTracker(10, 'Test');
    const elapsedBefore = tracker.getElapsedSeconds();
    expect(elapsedBefore).toBeGreaterThanOrEqual(0);
    tracker.increment();
    const elapsedAfter = tracker.getElapsedSeconds();
    expect(elapsedAfter).toBeGreaterThanOrEqual(elapsedBefore);
  });

  it('calculates processing rate', () => {
    const tracker = new ProgressTracker(10, 'Test');
    expect(tracker.getRate()).toBe(0); // No items processed yet
    tracker.increment();
    tracker.increment();
    const rate = tracker.getRate();
    expect(rate).toBeGreaterThan(0);
  });

  it('handles zero total gracefully', () => {
    const tracker = new ProgressTracker(0, 'Test');
    expect(tracker.getProgress()).toBeNaN(); // 0/0 is NaN
    tracker.increment();
    expect(tracker.getProgress()).toBe(Infinity); // 1/0 is Infinity
  });

  it('renders progress with console output', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write');
    const tracker = new ProgressTracker(5, 'Loading');
    tracker.increment();
    tracker.increment();
    expect(writeSpy).toHaveBeenCalled();
    writeSpy.mockRestore();
  });

  it('outputs newline when complete', () => {
    const writeSpy = vi.spyOn(process.stdout, 'write');
    const tracker = new ProgressTracker(2, 'Test');
    tracker.increment();
    tracker.increment();
    // Should output newline at completion
    expect(writeSpy).toHaveBeenCalled();
    writeSpy.mockRestore();
  });
});
