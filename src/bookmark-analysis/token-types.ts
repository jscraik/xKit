/**
 * Token usage tracking types
 */

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cost: number;
}

export interface TokenUsageRecord {
  operation: string;
  model: string;
  provider: string;
  usage: TokenUsage;
  timestamp: number;
}

export interface UsageReport {
  byModel: Record<string, TokenUsage>;
  byOperation: Record<string, TokenUsage>;
  byProvider: Record<string, TokenUsage>;
  total: TokenUsage;
  records: TokenUsageRecord[];
}

export interface PricingData {
  provider: string;
  model: string;
  inputPerMillion: number;
  outputPerMillion: number;
  cacheReadPerMillion?: number;
  cacheWritePerMillion?: number;
}

// Re-export TokenTracker class for convenience
export { TokenTracker } from './token-tracker.js';
