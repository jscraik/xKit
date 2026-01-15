/**
 * Export state management for resumable bookmark exports
 * Validates: Requirements 2.3
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * State data structure for export resumability
 */
export interface ExportStateData {
  lastCursor: string | null;
  processedCount: number;
  startTime: string;
}

/**
 * Manages export state for resumable bookmark exports
 *
 * The ExportState class handles:
 * - Saving export progress to a state file
 * - Loading state to resume interrupted exports
 * - Tracking cursor position, processed count, and start time
 * - Cleaning up state file on successful completion
 */
export class ExportState {
  private readonly stateFilePath: string;
  private state: ExportStateData | null = null;

  /**
   * Create a new ExportState instance
   * @param stateFilePath - Path to the state file (defaults to .bookmark_export_state.json)
   */
  constructor(stateFilePath = '.bookmark_export_state.json') {
    this.stateFilePath = path.resolve(stateFilePath);
  }

  /**
   * Initialize a new export state
   * @param startTime - ISO timestamp when export started
   */
  initialize(startTime?: string): void {
    this.state = {
      lastCursor: null,
      processedCount: 0,
      startTime: startTime || new Date().toISOString(),
    };
  }

  /**
   * Update the export state with new progress
   * @param cursor - Current cursor position (null if no more pages)
   * @param processedCount - Total number of bookmarks processed so far
   */
  update(cursor: string | null, processedCount: number): void {
    if (!this.state) {
      throw new Error('Export state not initialized. Call initialize() first.');
    }

    this.state.lastCursor = cursor;
    this.state.processedCount = processedCount;
  }

  /**
   * Save the current state to disk
   * @throws Error if state is not initialized or file write fails
   */
  save(): void {
    if (!this.state) {
      throw new Error('Export state not initialized. Call initialize() first.');
    }

    try {
      const json = JSON.stringify(this.state, null, 2);
      fs.writeFileSync(this.stateFilePath, json, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to save export state to ${this.stateFilePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Load state from disk
   * @returns true if state was loaded successfully, false if no state file exists
   * @throws Error if state file is invalid or cannot be read
   */
  load(): boolean {
    if (!fs.existsSync(this.stateFilePath)) {
      return false;
    }

    try {
      const json = fs.readFileSync(this.stateFilePath, 'utf-8');
      const data = JSON.parse(json) as ExportStateData;

      // Validate state data structure
      if (
        typeof data !== 'object' ||
        data === null ||
        typeof data.processedCount !== 'number' ||
        typeof data.startTime !== 'string' ||
        (data.lastCursor !== null && typeof data.lastCursor !== 'string')
      ) {
        throw new Error('Invalid state file format');
      }

      this.state = data;
      return true;
    } catch (error) {
      throw new Error(
        `Failed to load export state from ${this.stateFilePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete the state file from disk
   * Called on successful export completion
   */
  delete(): void {
    if (fs.existsSync(this.stateFilePath)) {
      try {
        fs.unlinkSync(this.stateFilePath);
      } catch (error) {
        throw new Error(
          `Failed to delete export state file ${this.stateFilePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  /**
   * Check if a state file exists on disk
   * @returns true if state file exists
   */
  exists(): boolean {
    return fs.existsSync(this.stateFilePath);
  }

  /**
   * Get the current state data
   * @returns Current state or null if not initialized
   */
  getState(): ExportStateData | null {
    return this.state ? { ...this.state } : null;
  }

  /**
   * Get the last cursor position for resuming
   * @returns Last cursor or null if at the beginning or no state
   */
  getLastCursor(): string | null {
    return this.state?.lastCursor ?? null;
  }

  /**
   * Get the number of bookmarks processed so far
   * @returns Processed count or 0 if no state
   */
  getProcessedCount(): number {
    return this.state?.processedCount ?? 0;
  }

  /**
   * Get the export start time
   * @returns Start time ISO string or null if no state
   */
  getStartTime(): string | null {
    return this.state?.startTime ?? null;
  }

  /**
   * Check if this is a resumed export
   * @returns true if state was loaded from disk (resumed export)
   */
  isResumed(): boolean {
    return this.state !== null && this.state.processedCount > 0;
  }
}
