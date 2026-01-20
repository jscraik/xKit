/**
 * Tests for TokenTracker
 */

import { describe, it, expect } from 'vitest';
import { TokenTracker } from '../../src/bookmark-analysis/token-tracker.js';

describe('TokenTracker', () => {
  it('should record token usage for a single operation', () => {
    const tracker = new TokenTracker();

    tracker.record('categorization', 'gpt-4o', 'openai', {
      input: 100,
      output: 50,
      cacheRead: 0,
      cacheWrite: 0,
    });

    const report = tracker.getReport();

    expect(report.total.input).toBe(100);
    expect(report.total.output).toBe(50);
    expect(report.byProvider.openai.input).toBe(100);
    expect(report.byProvider.openai.output).toBe(50);
    expect(report.byModel['gpt-4o'].input).toBe(100);
    expect(report.byOperation.categorization.input).toBe(100);
  });

  it('should calculate cost correctly for OpenAI models', () => {
    const tracker = new TokenTracker();

    tracker.record('categorization', 'gpt-4o', 'openai', {
      input: 1_000_000, // 1M tokens
      output: 500_000, // 0.5M tokens
      cacheRead: 0,
      cacheWrite: 0,
    });

    const report = tracker.getReport();

    // gpt-4o: $2.50/input per million, $10.00/output per million
    const expectedCost = (1_000_000 / 1_000_000) * 2.5 + (500_000 / 1_000_000) * 10.0;
    expect(report.total.cost).toBe(expectedCost);
    expect(report.total.cost).toBeGreaterThan(0);
  });

  it('should return zero cost for Ollama models', () => {
    const tracker = new TokenTracker();

    tracker.record('categorization', 'llama3.2', 'ollama', {
      input: 1_000_000,
      output: 500_000,
      cacheRead: 0,
      cacheWrite: 0,
    });

    const report = tracker.getReport();

    expect(report.total.cost).toBe(0);
  });

  it('should aggregate multiple records', () => {
    const tracker = new TokenTracker();

    tracker.record('categorization', 'gpt-4o', 'openai', {
      input: 100,
      output: 50,
      cacheRead: 0,
      cacheWrite: 0,
    });

    tracker.record('summarization', 'gpt-4o', 'openai', {
      input: 200,
      output: 100,
      cacheRead: 0,
      cacheWrite: 0,
    });

    const report = tracker.getReport();

    expect(report.total.input).toBe(300);
    expect(report.total.output).toBe(150);
    expect(report.byOperation.categorization.input).toBe(100);
    expect(report.byOperation.summarization.input).toBe(200);
  });

  it('should handle Anthropic cache tokens', () => {
    const tracker = new TokenTracker();

    tracker.record('categorization', 'claude-3-haiku-20240307', 'anthropic', {
      input: 100_000,
      output: 50_000,
      cacheRead: 20_000,
      cacheWrite: 5_000,
    });

    const report = tracker.getReport();

    // Anthropic Haiku: $0.25/input, $1.25/output, $0.03/cache read, $0.30/cache write per million
    const expectedCost =
      (100_000 / 1_000_000) * 0.25 +
      (50_000 / 1_000_000) * 1.25 +
      (20_000 / 1_000_000) * 0.03 +
      (5_000 / 1_000_000) * 0.30;

    expect(report.total.cost).toBeCloseTo(expectedCost, 3);
  });

  it('should reject negative token counts', () => {
    const tracker = new TokenTracker();

    expect(() => {
      tracker.record('categorization', 'gpt-4o', 'openai', {
        input: -100,
        output: 50,
        cacheRead: 0,
        cacheWrite: 0,
      });
    }).toThrow('Token counts cannot be negative');
  });

  it('should limit records to prevent memory leaks', () => {
    const tracker = new TokenTracker();

    // Add more records than the limit (10,000)
    for (let i = 0; i < 15_000; i++) {
      tracker.record('categorization', 'gpt-4o', 'openai', {
        input: 10,
        output: 5,
        cacheRead: 0,
        cacheWrite: 0,
      });
    }

    const report = tracker.getReport();

    // Should not exceed max records
    expect(report.records.length).toBeLessThanOrEqual(10_000);
    // But totals should still be correct
    expect(report.total.input).toBe(15_000 * 10);
  });

  it('should reset all tracking data', () => {
    const tracker = new TokenTracker();

    tracker.record('categorization', 'gpt-4o', 'openai', {
      input: 100,
      output: 50,
      cacheRead: 0,
      cacheWrite: 0,
    });

    expect(tracker.getReport().total.input).toBe(100);

    tracker.reset();

    expect(tracker.getReport().total.input).toBe(0);
    expect(tracker.getReport().records.length).toBe(0);
  });

  it('should format report as human-readable string', () => {
    const tracker = new TokenTracker();

    tracker.record('categorization', 'llama3.2', 'ollama', {
      input: 125_000,
      output: 25_000,
      cacheRead: 0,
      cacheWrite: 0,
    });

    const formatted = tracker.formatReport();

    expect(formatted).toContain('TOKEN USAGE');
    expect(formatted).toContain('Ollama:');
    expect(formatted).toContain('125,000 tokens');
    expect(formatted).toContain('25,000 tokens');
    expect(formatted).toContain('$0.000 (local)');
  });

  it('should record batch of records atomically', () => {
    const tracker = new TokenTracker();

    tracker.recordBatch([
      {
        operation: 'categorization',
        model: 'gpt-4o',
        provider: 'openai',
        usage: { input: 100, output: 50, cacheRead: 0, cacheWrite: 0 },
      },
      {
        operation: 'summarization',
        model: 'gpt-4o',
        provider: 'openai',
        usage: { input: 200, output: 100, cacheRead: 0, cacheWrite: 0 },
      },
    ]);

    const report = tracker.getReport();

    expect(report.total.input).toBe(300);
    expect(report.total.output).toBe(150);
  });
});
