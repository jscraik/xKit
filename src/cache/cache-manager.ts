/**
 * Cache manager for xKit
 * SQLite-based caching for extracts and summaries
 */

import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { homedir } from 'node:os';

const FORMAT_VERSION = 1;
const TTL_DAYS = 30;
const MAX_SIZE_BYTES = 512 * 1024 * 1024; // 512 MB

/**
 * Cache entry
 */
interface CacheEntry {
  key: string;
  value: string;
  created_at: string;
  access_count: number;
  size: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number;
  sizeBytes: number;
  sizeFormatted: string;
}

/**
 * Extract options
 */
export interface ExtractOptions {
  extractFullContent?: boolean;
}

/**
 * Summary options
 */
export interface SummaryOptions {
  contentHash: string;
  promptHash: string;
  model: string;
  length?: string;
  language?: string;
}

/**
 * Get default cache path
 */
export function getDefaultCachePath(): string {
  return join(homedir(), '.config', 'xkit', 'cache.db');
}

/**
 * Check if cache exists
 */
export function cacheExists(): boolean {
  const cachePath = getDefaultCachePath();
  return existsSync(cachePath);
}

/**
 * Cache manager
 */
export class CacheManager {
  private db: DatabaseSync;
  private cacheHits = 0;
  private cacheMisses = 0;
  private cachePath: string;

  constructor(customPath?: string) {
    this.cachePath = customPath ?? getDefaultCachePath();
    this.ensureCacheDirectory();
    this.db = new DatabaseSync(this.cachePath);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.initializeSchema();
  }

  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectory(): void {
    const dir = dirname(this.cachePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        accessed_at TEXT NOT NULL DEFAULT (datetime('now')),
        access_count INTEGER NOT NULL DEFAULT 1,
        size INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_created_at ON cache_entries(created_at);
      CREATE INDEX IF NOT EXISTS idx_accessed_at ON cache_entries(accessed_at);
    `);
  }

  /**
   * Generate cache key for URL extraction
   */
  getExtractKey(url: string, extractSettings: ExtractOptions): string {
    return this.hashJson({
      url,
      extractSettings,
      formatVersion: FORMAT_VERSION,
    });
  }

  /**
   * Generate cache key for summarization
   */
  getSummaryKey(options: SummaryOptions): string {
    return this.hashJson({
      contentHash: options.contentHash,
      promptHash: options.promptHash,
      model: options.model,
      length: options.length,
      language: options.language,
      formatVersion: FORMAT_VERSION,
    });
  }

  /**
   * Hash JSON object for cache key
   */
  private hashJson(obj: unknown): string {
    const crypto = require('node:crypto');
    const json = JSON.stringify(obj);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  /**
   * Get value from cache
   */
  get(key: string): string | null {
    this.sweepTTL();

    const row = this.db.prepare(`
      SELECT value FROM cache_entries
      WHERE key = ? AND created_at > datetime('now', '-${TTL_DAYS} days')
    `).get(key) as CacheEntry | undefined;

    if (row) {
      this.cacheHits++;
      this.db.prepare(`
        UPDATE cache_entries
        SET accessed_at = datetime('now'), access_count = access_count + 1
        WHERE key = ?
      `).run(key);
      return row.value;
    }

    this.cacheMisses++;
    return null;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: string): void {
    const size = Buffer.byteLength(value, 'utf8');

    this.db.prepare(`
      INSERT OR REPLACE INTO cache_entries (key, value, size, created_at, accessed_at, access_count)
      VALUES (?, ?, ?, datetime('now'), datetime('now'), 1)
    `).run(key, value, size);

    this.enforceSizeCap();
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): void {
    this.db.prepare('DELETE FROM cache_entries WHERE key = ?').run(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.db.exec('DELETE FROM cache_entries');
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Sweep expired entries
   */
  private sweepTTL(): void {
    this.db.prepare(`
      DELETE FROM cache_entries
      WHERE created_at < datetime('now', '-${TTL_DAYS} days')
    `).run();
  }

  /**
   * Enforce size cap using LRU eviction
   */
  private enforceSizeCap(): void {
    const sizeResult = this.db.prepare(`
      SELECT COALESCE(SUM(size), 0) as total FROM cache_entries
    `).get() as { total: number };

    if (sizeResult.total > MAX_SIZE_BYTES) {
      this.db.prepare(`
        DELETE FROM cache_entries
        WHERE key IN (
          SELECT key FROM cache_entries
          ORDER BY accessed_at ASC
          LIMIT (SELECT COUNT(*) / 10 FROM cache_entries)
        )
      `).run();
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalResult = this.db.prepare('SELECT COUNT(*) as count FROM cache_entries')
      .get() as { count: number };
    const sizeResult = this.db.prepare(`
      SELECT COALESCE(SUM(size), 0) as total FROM cache_entries
    `).get() as { total: number };

    const totalEntries = totalResult.count;
    const hitRate = this.cacheHits + this.cacheMisses > 0
      ? this.cacheHits / (this.cacheHits + this.cacheMisses)
      : 0;

    return {
      totalEntries,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate,
      sizeBytes: sizeResult.total,
      sizeFormatted: this.formatBytes(sizeResult.total),
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
