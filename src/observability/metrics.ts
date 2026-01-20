/**
 * Metrics collector for tracking performance and usage
 */

export class MetricsCollector {
  private metrics = {
    // LLM metrics
    llmRequests: 0,
    llmErrors: 0,
    llmTimeouts: 0,
    tokensUsed: {
      input: 0,
      output: 0,
      total: 0,
    },

    // Cache metrics
    cacheHits: 0,
    cacheMisses: 0,

    // Performance metrics (latency in ms)
    summarizationLatency: [] as number[],
    enrichmentLatency: [] as number[],
    categorizationLatency: [] as number[],

    // Processing metrics
    bookmarksProcessed: 0,
    bookmarksSkipped: 0,
    bookmarksFailed: 0,
  };

  /**
   * Record an LLM request
   */
  recordLLMRequest(options: {
    duration: number; // milliseconds
    tokens: { input: number; output: number };
    success: boolean;
  }): void {
    this.metrics.llmRequests++;
    this.metrics.tokensUsed.input += options.tokens.input;
    this.metrics.tokensUsed.output += options.tokens.output;
    this.metrics.tokensUsed.total += options.tokens.input + options.tokens.output;
    this.metrics.summarizationLatency.push(options.duration);

    if (!options.success) {
      this.metrics.llmErrors++;
    }
  }

  /**
   * Record an LLM timeout
   */
  recordLLMTimeout(): void {
    this.metrics.llmTimeouts++;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++;
  }

  /**
   * Record enrichment latency
   */
  recordEnrichment(duration: number): void {
    this.metrics.enrichmentLatency.push(duration);
  }

  /**
   * Record categorization latency
   */
  recordCategorization(duration: number): void {
    this.metrics.categorizationLatency.push(duration);
  }

  /**
   * Record bookmark processed
   */
  recordBookmarkProcessed(): void {
    this.metrics.bookmarksProcessed++;
  }

  /**
   * Record bookmark skipped
   */
  recordBookmarkSkipped(): void {
    this.metrics.bookmarksSkipped++;
  }

  /**
   * Record bookmark failed
   */
  recordBookmarkFailed(): void {
    this.metrics.bookmarksFailed++;
  }

  /**
   * Get summary of all metrics
   */
  getSummary() {
    const cacheHitRate = this.getCacheHitRate();
    const errorRate = this.getErrorRate();
    const avgSummarizationLatency = this.getAverageLatency(this.metrics.summarizationLatency);
    const avgEnrichmentLatency = this.getAverageLatency(this.metrics.enrichmentLatency);
    const avgCategorizationLatency = this.getAverageLatency(this.metrics.categorizationLatency);

    return {
      // LLM metrics
      llmRequests: this.metrics.llmRequests,
      llmErrors: this.metrics.llmErrors,
      llmTimeouts: this.metrics.llmTimeouts,
      errorRate,
      tokensUsed: { ...this.metrics.tokensUsed },

      // Cache metrics
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      cacheHitRate,

      // Performance metrics
      avgSummarizationLatency,
      avgEnrichmentLatency,
      avgCategorizationLatency,

      // Processing metrics
      bookmarksProcessed: this.metrics.bookmarksProcessed,
      bookmarksSkipped: this.metrics.bookmarksSkipped,
      bookmarksFailed: this.metrics.bookmarksFailed,
    };
  }

  /**
   * Format metrics as human-readable string
   */
  formatSummary(): string {
    const summary = this.getSummary();
    const lines = [];

    lines.push('📊 Performance Metrics:');
    lines.push('');

    // LLM metrics
    lines.push('LLM Requests:');
    lines.push(`   Total requests: ${summary.llmRequests}`);
    lines.push(`   Errors: ${summary.llmErrors} (${(summary.errorRate * 100).toFixed(1)}%)`);
    lines.push(`   Timeouts: ${summary.llmTimeouts}`);
    lines.push(`   Tokens: ${summary.tokensUsed.total.toLocaleString()} (${summary.tokensUsed.input} input + ${summary.tokensUsed.output} output)`);
    lines.push('');

    // Cache metrics
    lines.push('Cache:');
    lines.push(`   Hits: ${summary.cacheHits}`);
    lines.push(`   Misses: ${summary.cacheMisses}`);
    lines.push(`   Hit rate: ${(summary.cacheHitRate * 100).toFixed(1)}%`);
    lines.push('');

    // Performance metrics
    if (summary.avgSummarizationLatency > 0) {
      lines.push('Latency (average):');
      lines.push(`   Summarization: ${this.formatDuration(summary.avgSummarizationLatency)}`);
    }
    if (summary.avgEnrichmentLatency > 0) {
      lines.push(`   Enrichment: ${this.formatDuration(summary.avgEnrichmentLatency)}`);
    }
    if (summary.avgCategorizationLatency > 0) {
      lines.push(`   Categorization: ${this.formatDuration(summary.avgCategorizationLatency)}`);
    }
    lines.push('');

    // Processing metrics
    lines.push('Processing:');
    lines.push(`   Processed: ${summary.bookmarksProcessed}`);
    lines.push(`   Skipped: ${summary.bookmarksSkipped}`);
    lines.push(`   Failed: ${summary.bookmarksFailed}`);

    return lines.join('\n');
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = {
      llmRequests: 0,
      llmErrors: 0,
      llmTimeouts: 0,
      tokensUsed: { input: 0, output: 0, total: 0 },
      cacheHits: 0,
      cacheMisses: 0,
      summarizationLatency: [],
      enrichmentLatency: [],
      categorizationLatency: [],
      bookmarksProcessed: 0,
      bookmarksSkipped: 0,
      bookmarksFailed: 0,
    };
  }

  /**
   * Calculate cache hit rate
   */
  private getCacheHitRate(): number {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return total > 0 ? this.metrics.cacheHits / total : 0;
  }

  /**
   * Calculate error rate
   */
  private getErrorRate(): number {
    return this.metrics.llmRequests > 0 ? this.metrics.llmErrors / this.metrics.llmRequests : 0;
  }

  /**
   * Calculate average latency from array
   */
  private getAverageLatency(latencies: number[]): number {
    if (latencies.length === 0) return 0;
    const sum = latencies.reduce((a, b) => a + b, 0);
    return sum / latencies.length;
  }

  /**
   * Format duration in milliseconds to human-readable string
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`;
    }
    const seconds = ms / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  }

  /**
   * Get raw metrics (for testing or custom formatting)
   */
  getRawMetrics() {
    return { ...this.metrics };
  }
}
