/**
 * State management for incremental bookmark processing
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface BookmarkState {
  lastExportTimestamp: string;
  lastBookmarkId: string;
  processedBookmarkIds: Set<string>;
  totalProcessed: number;
  lastCursor?: string;
}

export class StateManager {
  private stateFile: string;
  private state: BookmarkState;

  constructor(stateFile: string = '.xkit/state/bookmarks-state.json') {
    this.stateFile = stateFile;
    this.state = this.load();
  }

  /**
   * Load state from file
   */
  private load(): BookmarkState {
    if (!existsSync(this.stateFile)) {
      return {
        lastExportTimestamp: new Date(0).toISOString(),
        lastBookmarkId: '',
        processedBookmarkIds: new Set(),
        totalProcessed: 0,
      };
    }

    try {
      const data = JSON.parse(readFileSync(this.stateFile, 'utf-8'));
      return {
        lastExportTimestamp: data.lastExportTimestamp || new Date(0).toISOString(),
        lastBookmarkId: data.lastBookmarkId || '',
        processedBookmarkIds: new Set(data.processedBookmarkIds || []),
        totalProcessed: data.totalProcessed || 0,
        lastCursor: data.lastCursor,
      };
    } catch (error) {
      console.error('Failed to load state, starting fresh:', error);
      return {
        lastExportTimestamp: new Date(0).toISOString(),
        lastBookmarkId: '',
        processedBookmarkIds: new Set(),
        totalProcessed: 0,
      };
    }
  }

  /**
   * Save state to file
   */
  save(): void {
    const dir = dirname(this.stateFile);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data = {
      lastExportTimestamp: this.state.lastExportTimestamp,
      lastBookmarkId: this.state.lastBookmarkId,
      processedBookmarkIds: Array.from(this.state.processedBookmarkIds),
      totalProcessed: this.state.totalProcessed,
      lastCursor: this.state.lastCursor,
    };

    writeFileSync(this.stateFile, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Check if bookmark has been processed
   */
  isProcessed(bookmarkId: string): boolean {
    return this.state.processedBookmarkIds.has(bookmarkId);
  }

  /**
   * Mark bookmark as processed
   */
  markProcessed(bookmarkId: string): void {
    this.state.processedBookmarkIds.add(bookmarkId);
    this.state.totalProcessed++;
    this.state.lastBookmarkId = bookmarkId;
    this.state.lastExportTimestamp = new Date().toISOString();
  }

  /**
   * Mark multiple bookmarks as processed
   */
  markBatchProcessed(bookmarkIds: string[]): void {
    for (const id of bookmarkIds) {
      this.state.processedBookmarkIds.add(id);
    }
    this.state.totalProcessed += bookmarkIds.length;
    if (bookmarkIds.length > 0) {
      this.state.lastBookmarkId = bookmarkIds[bookmarkIds.length - 1];
      this.state.lastExportTimestamp = new Date().toISOString();
    }
  }

  /**
   * Update cursor for pagination
   */
  updateCursor(cursor: string | undefined): void {
    this.state.lastCursor = cursor;
  }

  /**
   * Get last export timestamp
   */
  getLastExportTimestamp(): string {
    return this.state.lastExportTimestamp;
  }

  /**
   * Get total processed count
   */
  getTotalProcessed(): number {
    return this.state.totalProcessed;
  }

  /**
   * Get last cursor
   */
  getLastCursor(): string | undefined {
    return this.state.lastCursor;
  }

  /**
   * Reset state
   */
  reset(): void {
    this.state = {
      lastExportTimestamp: new Date(0).toISOString(),
      lastBookmarkId: '',
      processedBookmarkIds: new Set(),
      totalProcessed: 0,
    };
    this.save();
  }

  /**
   * Get state statistics
   */
  getStats(): {
    totalProcessed: number;
    lastExportTimestamp: string;
    lastBookmarkId: string;
    hasCursor: boolean;
  } {
    return {
      totalProcessed: this.state.totalProcessed,
      lastExportTimestamp: this.state.lastExportTimestamp,
      lastBookmarkId: this.state.lastBookmarkId,
      hasCursor: !!this.state.lastCursor,
    };
  }

  /**
   * Filter out already processed bookmarks
   */
  filterNew<T extends { id: string }>(bookmarks: T[]): T[] {
    return bookmarks.filter((b) => !this.isProcessed(b.id));
  }
}
