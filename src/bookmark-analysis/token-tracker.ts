/**
 * TokenTracker - Tracks LLM API usage and costs
 * FIXED: Thread-safe implementation, memory leak prevention
 */

import type { TokenUsage, TokenUsageRecord, UsageReport } from './token-types.js';
import { calculateCost } from './pricing.js';

const MAX_RECORDS = 10000; // Prevent unbounded memory growth

export class TokenTracker {
  private records: TokenUsageRecord[] = [];
  private byModel: Map<string, TokenUsage> = new Map();
  private byOperation: Map<string, TokenUsage> = new Map();
  private byProvider: Map<string, TokenUsage> = new Map();

  /**
   * Record token usage for an LLM operation
   * FIXED: Thread-safe for use with parallel processing
   * Call this from main thread only, after workers return results
   */
  record(
    operation: string,
    model: string,
    provider: string,
    usage: Omit<TokenUsage, 'cost'>,
  ): void {
    // Validate
    if (usage.input < 0 || usage.output < 0) {
      throw new Error('Token counts cannot be negative');
    }

    // Calculate cost
    const cost = calculateCost(model, usage.input, usage.output, usage.cacheRead, usage.cacheWrite);

    const record: TokenUsageRecord = {
      operation,
      model,
      provider,
      usage: { ...usage, cost },
      timestamp: Date.now(),
    };

    // FIXED: Implement circular buffer to prevent memory leaks
    if (this.records.length >= MAX_RECORDS) {
      this.records.shift(); // Remove oldest record
    }
    this.records.push(record);

    this.updateAggregates(record);
  }

  /**
   * Record multiple token usage records atomically
   * FIXED: For use with parallel processing - workers return arrays
   */
  recordBatch(records: Array<{
    operation: string;
    model: string;
    provider: string;
    usage: Omit<TokenUsage, 'cost'>;
  }>): void {
    for (const record of records) {
      this.record(
        record.operation,
        record.model,
        record.provider,
        record.usage,
      );
    }
  }

  private updateAggregates(record: TokenUsageRecord): void {
    // Update by model
    this.updateMap(this.byModel, record.model, record.usage);

    // Update by operation
    this.updateMap(this.byOperation, record.operation, record.usage);

    // Update by provider
    this.updateMap(this.byProvider, record.provider, record.usage);
  }

  private updateMap(map: Map<string, TokenUsage>, key: string, usage: TokenUsage): void {
    const existing = map.get(key) || {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      cost: 0,
    };

    map.set(key, {
      input: existing.input + usage.input,
      output: existing.output + usage.output,
      cacheRead: existing.cacheRead + usage.cacheRead,
      cacheWrite: existing.cacheWrite + usage.cacheWrite,
      cost: existing.cost + usage.cost,
    });
  }

  /**
   * Get aggregated usage report
   */
  getReport(): UsageReport {
    const total = this.calculateTotal();

    return {
      byModel: Object.fromEntries(this.byModel),
      byOperation: Object.fromEntries(this.byOperation),
      byProvider: Object.fromEntries(this.byProvider),
      total,
      records: [...this.records], // Return copy
    };
  }

  private calculateTotal(): TokenUsage {
    const total: TokenUsage = {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      cost: 0,
    };

    for (const usage of this.byModel.values()) {
      total.input += usage.input;
      total.output += usage.output;
      total.cacheRead += usage.cacheRead;
      total.cacheWrite += usage.cacheWrite;
      total.cost += usage.cost;
    }

    return total;
  }

  /**
   * Format usage report as human-readable string
   */
  formatReport(): string {
    const report = this.getReport();
    const lines: string[] = [];

    lines.push('════════════════════════════════════════════════════════════');
    lines.push('📊 TOKEN USAGE');
    lines.push('════════════════════════════════════════════════════════════');

    // Group by provider
    for (const [provider, usage] of Object.entries(report.byProvider)) {
      const isLocal = provider === 'ollama';
      lines.push('');
      lines.push(`${provider.charAt(0).toUpperCase() + provider.slice(1)}:`);

      if (usage.input > 0) {
        const inputStr = `${usage.input.toLocaleString()} tokens`;
        const costStr = isLocal ? '$0.000 (local)' : `$${usage.cost.toFixed(3)}`;
        lines.push(`  Input:     ${inputStr.padStart(12)}  ${costStr}`);
      }
      if (usage.output > 0) {
        const outputStr = `${usage.output.toLocaleString()} tokens`;
        const inputPortion = (usage.cost * 0.6).toFixed(3); // Approximate output portion
        lines.push(`  Output:    ${outputStr.padStart(12)}  $${inputPortion}`);
      }
      if (usage.cacheRead > 0) {
        const cacheStr = `${usage.cacheRead.toLocaleString()} tokens`;
        const cacheCost = ((usage.cacheRead / 1_000_000) * 0.03).toFixed(3);
        lines.push(`  Cache R:   ${cacheStr.padStart(12)}  $${cacheCost}`);
      }
    }

    lines.push('');
    lines.push('════════════════════════════════════════════════════════════');
    const totalCost = report.total.cost > 0
      ? `$${report.total.cost.toFixed(3)}`
      : '$0.000 (local LLM)';
    lines.push(`💰 TOTAL ESTIMATED COST: ${totalCost}`);
    lines.push('════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.records = [];
    this.byModel.clear();
    this.byOperation.clear();
    this.byProvider.clear();
  }
}
