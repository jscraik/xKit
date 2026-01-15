/**
 * Statistics tracking and reporting
 */

import type { CategorizedBookmark } from '../bookmark-categorization/types.js';
import type { ArchiveStats, GrowthStats, ProcessingStats } from './types.js';

export class StatsTracker {
  private processingStats: ProcessingStats;

  constructor() {
    this.processingStats = {
      startTime: Date.now(),
      bookmarksProcessed: 0,
      bookmarksSkipped: 0,
      enrichmentTime: 0,
      categorizationTime: 0,
      writingTime: 0,
      errors: 0,
    };
  }

  /**
   * Start tracking
   */
  start(): void {
    this.processingStats.startTime = Date.now();
  }

  /**
   * End tracking
   */
  end(): void {
    this.processingStats.endTime = Date.now();
  }

  /**
   * Record bookmarks processed
   */
  recordProcessed(count: number): void {
    this.processingStats.bookmarksProcessed += count;
  }

  /**
   * Record bookmarks skipped
   */
  recordSkipped(count: number): void {
    this.processingStats.bookmarksSkipped += count;
  }

  /**
   * Record enrichment time
   */
  recordEnrichmentTime(ms: number): void {
    this.processingStats.enrichmentTime += ms;
  }

  /**
   * Record categorization time
   */
  recordCategorizationTime(ms: number): void {
    this.processingStats.categorizationTime += ms;
  }

  /**
   * Record writing time
   */
  recordWritingTime(ms: number): void {
    this.processingStats.writingTime += ms;
  }

  /**
   * Record error
   */
  recordError(): void {
    this.processingStats.errors++;
  }

  /**
   * Get processing stats
   */
  getProcessingStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Get total duration
   */
  getDuration(): number {
    const end = this.processingStats.endTime || Date.now();
    return end - this.processingStats.startTime;
  }

  /**
   * Generate archive stats
   */
  generateArchiveStats(
    bookmarks: CategorizedBookmark[],
    knowledgeFileCount: number,
    archiveSize: number,
  ): ArchiveStats {
    const categoryCounts: Record<string, number> = {};

    for (const bookmark of bookmarks) {
      categoryCounts[bookmark.category] = (categoryCounts[bookmark.category] || 0) + 1;
    }

    return {
      totalBookmarks: bookmarks.length,
      totalKnowledgeFiles: knowledgeFileCount,
      categoryCounts,
      archiveSize,
      lastUpdated: new Date().toISOString(),
      processingTime: this.getDuration(),
    };
  }

  /**
   * Format stats for display
   */
  formatStats(): string {
    const duration = this.getDuration();
    const stats = this.processingStats;

    const lines = [
      '📊 Processing Statistics',
      '─────────────────────────',
      `⏱️  Total Duration: ${this.formatDuration(duration)}`,
      `✅ Processed: ${stats.bookmarksProcessed}`,
      `⏭️  Skipped: ${stats.bookmarksSkipped}`,
      '',
      '⏱️  Time Breakdown:',
      `   Enrichment: ${this.formatDuration(stats.enrichmentTime)}`,
      `   Categorization: ${this.formatDuration(stats.categorizationTime)}`,
      `   Writing: ${this.formatDuration(stats.writingTime)}`,
    ];

    if (stats.errors > 0) {
      lines.push('', `❌ Errors: ${stats.errors}`);
    }

    return lines.join('\n');
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Generate progress bar
   */
  generateProgressBar(current: number, total: number, width: number = 40): string {
    const percentage = Math.min(100, Math.round((current / total) * 100));
    const filled = Math.round((width * current) / total);
    const empty = width - filled;

    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `[${bar}] ${percentage}% (${current}/${total})`;
  }

  /**
   * Calculate growth stats
   */
  calculateGrowth(timestamps: string[]): GrowthStats {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    for (const timestamp of timestamps) {
      const time = new Date(timestamp).getTime();

      if (time >= oneDayAgo) {
        daily++;
      }
      if (time >= oneWeekAgo) {
        weekly++;
      }
      if (time >= oneMonthAgo) {
        monthly++;
      }
    }

    return {
      daily,
      weekly,
      monthly,
      total: timestamps.length,
    };
  }

  /**
   * Format growth stats
   */
  formatGrowthStats(growth: GrowthStats): string {
    return [
      '📈 Archive Growth',
      '─────────────────',
      `📅 Last 24 hours: ${growth.daily}`,
      `📅 Last 7 days: ${growth.weekly}`,
      `📅 Last 30 days: ${growth.monthly}`,
      `📚 Total: ${growth.total}`,
    ].join('\n');
  }
}
