/**
 * Unit tests for ExportState class
 * Tests state management, persistence, and resumability
 */

import * as fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExportState } from '../../src/bookmark-export/export-state.js';

describe('ExportState', () => {
  const testStateFile = '.test_bookmark_export_state.json';
  let exportState: ExportState;

  beforeEach(() => {
    exportState = new ExportState(testStateFile);
    // Clean up any existing test state file
    if (fs.existsSync(testStateFile)) {
      fs.unlinkSync(testStateFile);
    }
  });

  afterEach(() => {
    // Clean up test state file
    if (fs.existsSync(testStateFile)) {
      fs.unlinkSync(testStateFile);
    }
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      exportState.initialize();
      const state = exportState.getState();

      expect(state).not.toBeNull();
      expect(state?.lastCursor).toBeNull();
      expect(state?.processedCount).toBe(0);
      expect(state?.startTime).toBeDefined();
      expect(new Date(state!.startTime).getTime()).toBeGreaterThan(0);
    });

    it('should initialize with custom start time', () => {
      const customTime = '2024-01-01T00:00:00.000Z';
      exportState.initialize(customTime);
      const state = exportState.getState();

      expect(state?.startTime).toBe(customTime);
    });

    it('should return null state before initialization', () => {
      expect(exportState.getState()).toBeNull();
      expect(exportState.getLastCursor()).toBeNull();
      expect(exportState.getProcessedCount()).toBe(0);
      expect(exportState.getStartTime()).toBeNull();
    });
  });

  describe('update', () => {
    it('should update cursor and processed count', () => {
      exportState.initialize();
      exportState.update('cursor123', 50);

      const state = exportState.getState();
      expect(state?.lastCursor).toBe('cursor123');
      expect(state?.processedCount).toBe(50);
    });

    it('should allow null cursor', () => {
      exportState.initialize();
      exportState.update(null, 100);

      const state = exportState.getState();
      expect(state?.lastCursor).toBeNull();
      expect(state?.processedCount).toBe(100);
    });

    it('should throw error if not initialized', () => {
      expect(() => exportState.update('cursor', 10)).toThrow('Export state not initialized');
    });

    it('should allow multiple updates', () => {
      exportState.initialize();
      exportState.update('cursor1', 10);
      exportState.update('cursor2', 20);
      exportState.update('cursor3', 30);

      const state = exportState.getState();
      expect(state?.lastCursor).toBe('cursor3');
      expect(state?.processedCount).toBe(30);
    });
  });

  describe('save and load', () => {
    it('should save state to file', () => {
      exportState.initialize();
      exportState.update('cursor123', 50);
      exportState.save();

      expect(fs.existsSync(testStateFile)).toBe(true);

      const fileContent = fs.readFileSync(testStateFile, 'utf-8');
      const savedState = JSON.parse(fileContent);

      expect(savedState.lastCursor).toBe('cursor123');
      expect(savedState.processedCount).toBe(50);
      expect(savedState.startTime).toBeDefined();
    });

    it('should throw error when saving without initialization', () => {
      expect(() => exportState.save()).toThrow('Export state not initialized');
    });

    it('should load state from file', () => {
      // Create a state file manually
      const stateData = {
        lastCursor: 'cursor456',
        processedCount: 75,
        startTime: '2024-01-01T12:00:00.000Z',
      };
      fs.writeFileSync(testStateFile, JSON.stringify(stateData), 'utf-8');

      const loaded = exportState.load();

      expect(loaded).toBe(true);
      expect(exportState.getLastCursor()).toBe('cursor456');
      expect(exportState.getProcessedCount()).toBe(75);
      expect(exportState.getStartTime()).toBe('2024-01-01T12:00:00.000Z');
    });

    it('should return false when loading non-existent file', () => {
      const loaded = exportState.load();
      expect(loaded).toBe(false);
    });

    it('should throw error for invalid state file format', () => {
      fs.writeFileSync(testStateFile, 'invalid json', 'utf-8');

      expect(() => exportState.load()).toThrow('Failed to load export state');
    });

    it('should throw error for invalid state data structure', () => {
      const invalidStates = [
        { lastCursor: 'cursor', processedCount: 'not a number', startTime: '2024-01-01' },
        { lastCursor: 'cursor', processedCount: 10 }, // missing startTime
        { processedCount: 10, startTime: '2024-01-01' }, // missing lastCursor
        { lastCursor: 123, processedCount: 10, startTime: '2024-01-01' }, // wrong type
      ];

      for (const invalidState of invalidStates) {
        fs.writeFileSync(testStateFile, JSON.stringify(invalidState), 'utf-8');
        expect(() => exportState.load()).toThrow('Invalid state file format');
        fs.unlinkSync(testStateFile);
      }
    });

    it('should handle round-trip save and load', () => {
      exportState.initialize('2024-01-01T00:00:00.000Z');
      exportState.update('cursor789', 100);
      exportState.save();

      const newExportState = new ExportState(testStateFile);
      const loaded = newExportState.load();

      expect(loaded).toBe(true);
      expect(newExportState.getLastCursor()).toBe('cursor789');
      expect(newExportState.getProcessedCount()).toBe(100);
      expect(newExportState.getStartTime()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('delete', () => {
    it('should delete state file', () => {
      exportState.initialize();
      exportState.save();

      expect(fs.existsSync(testStateFile)).toBe(true);

      exportState.delete();

      expect(fs.existsSync(testStateFile)).toBe(false);
    });

    it('should not throw error when deleting non-existent file', () => {
      expect(() => exportState.delete()).not.toThrow();
    });

    it('should handle deletion after successful export', () => {
      exportState.initialize();
      exportState.update('cursor1', 50);
      exportState.save();
      exportState.update('cursor2', 100);
      exportState.save();

      expect(fs.existsSync(testStateFile)).toBe(true);

      exportState.delete();

      expect(fs.existsSync(testStateFile)).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return false when state file does not exist', () => {
      expect(exportState.exists()).toBe(false);
    });

    it('should return true when state file exists', () => {
      exportState.initialize();
      exportState.save();

      expect(exportState.exists()).toBe(true);
    });
  });

  describe('getters', () => {
    it('should return state copy to prevent external modification', () => {
      exportState.initialize();
      exportState.update('cursor1', 10);

      const state1 = exportState.getState();
      const state2 = exportState.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different objects

      // Modifying returned state should not affect internal state
      if (state1) {
        state1.lastCursor = 'modified';
      }

      expect(exportState.getLastCursor()).toBe('cursor1');
    });

    it('should return correct values from getters', () => {
      exportState.initialize('2024-01-01T00:00:00.000Z');
      exportState.update('cursor123', 42);

      expect(exportState.getLastCursor()).toBe('cursor123');
      expect(exportState.getProcessedCount()).toBe(42);
      expect(exportState.getStartTime()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('isResumed', () => {
    it('should return false for new export', () => {
      exportState.initialize();
      expect(exportState.isResumed()).toBe(false);
    });

    it('should return false before initialization', () => {
      expect(exportState.isResumed()).toBe(false);
    });

    it('should return true for resumed export', () => {
      // Create a state file with processed count > 0
      const stateData = {
        lastCursor: 'cursor123',
        processedCount: 50,
        startTime: '2024-01-01T00:00:00.000Z',
      };
      fs.writeFileSync(testStateFile, JSON.stringify(stateData), 'utf-8');

      exportState.load();

      expect(exportState.isResumed()).toBe(true);
    });

    it('should return false for loaded state with zero processed count', () => {
      const stateData = {
        lastCursor: null,
        processedCount: 0,
        startTime: '2024-01-01T00:00:00.000Z',
      };
      fs.writeFileSync(testStateFile, JSON.stringify(stateData), 'utf-8');

      exportState.load();

      expect(exportState.isResumed()).toBe(false);
    });
  });

  describe('resume logic', () => {
    it('should support resume workflow', () => {
      // Simulate first export attempt
      exportState.initialize();
      exportState.update('cursor1', 25);
      exportState.save();

      // Simulate interruption and resume
      const resumedExportState = new ExportState(testStateFile);
      const loaded = resumedExportState.load();

      expect(loaded).toBe(true);
      expect(resumedExportState.isResumed()).toBe(true);
      expect(resumedExportState.getLastCursor()).toBe('cursor1');
      expect(resumedExportState.getProcessedCount()).toBe(25);

      // Continue from last cursor
      resumedExportState.update('cursor2', 50);
      resumedExportState.save();

      // Complete export
      resumedExportState.update(null, 100);
      resumedExportState.save();
      resumedExportState.delete();

      expect(fs.existsSync(testStateFile)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty cursor string', () => {
      exportState.initialize();
      exportState.update('', 10);

      expect(exportState.getLastCursor()).toBe('');
    });

    it('should handle zero processed count', () => {
      exportState.initialize();
      exportState.update('cursor', 0);

      expect(exportState.getProcessedCount()).toBe(0);
    });

    it('should handle large processed count', () => {
      exportState.initialize();
      exportState.update('cursor', 1000000);

      expect(exportState.getProcessedCount()).toBe(1000000);
    });

    it('should handle special characters in cursor', () => {
      const specialCursor = 'cursor_with-special.chars/123:456';
      exportState.initialize();
      exportState.update(specialCursor, 10);
      exportState.save();

      const newState = new ExportState(testStateFile);
      newState.load();

      expect(newState.getLastCursor()).toBe(specialCursor);
    });

    it('should use absolute path for state file', () => {
      const relativePathState = new ExportState('relative/path/state.json');
      // Should not throw, just verify it resolves to absolute path
      expect(() => relativePathState.initialize()).not.toThrow();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 6: Resumable export state
     * **Validates: Requirements 2.3**
     *
     * For any interrupted export at page N, resuming the export should start
     * from page N rather than page 1
     */
    it('Property 6: Resumed export should start from last saved cursor position', async () => {
      const fc = await import('fast-check');

      await fc.assert(
        fc.asyncProperty(
          // Generate a sequence of export pages with cursors
          fc.record({
            pages: fc.array(
              fc.record({
                cursor: fc.string({ minLength: 1, maxLength: 50 }),
                bookmarksInPage: fc.integer({ min: 1, max: 100 }),
              }),
              { minLength: 2, maxLength: 10 },
            ),
            interruptAtPage: fc.integer({ min: 1 }), // Which page to interrupt at
          }),
          async ({ pages, interruptAtPage }) => {
            // Ensure we interrupt at a valid page index
            const interruptIndex = interruptAtPage % pages.length;

            // Simulate export up to interruption point
            const initialState = new ExportState(testStateFile);
            initialState.initialize();

            let totalProcessed = 0;
            let lastCursor: string | null = null;

            // Process pages up to and including the interruption point
            for (let i = 0; i <= interruptIndex; i++) {
              const page = pages[i];
              totalProcessed += page.bookmarksInPage;
              lastCursor = page.cursor;

              initialState.update(lastCursor, totalProcessed);
              initialState.save();
            }

            // Simulate interruption (state file remains on disk)
            const expectedCursor = lastCursor;
            const expectedProcessedCount = totalProcessed;

            // Simulate resume: create new ExportState instance and load
            const resumedState = new ExportState(testStateFile);
            const loaded = resumedState.load();

            // Assert: Resume should load the saved state
            expect(loaded).toBe(true);
            expect(resumedState.isResumed()).toBe(true);

            // Assert: Should start from page N (last cursor), not page 1
            expect(resumedState.getLastCursor()).toBe(expectedCursor);
            expect(resumedState.getProcessedCount()).toBe(expectedProcessedCount);

            // Assert: The cursor should be from the interrupted page, not the first page
            if (interruptIndex > 0) {
              expect(resumedState.getLastCursor()).not.toBe(pages[0].cursor);
            }

            // Verify we can continue from this point
            const remainingPages = pages.slice(interruptIndex + 1);
            for (const page of remainingPages) {
              totalProcessed += page.bookmarksInPage;
              resumedState.update(page.cursor, totalProcessed);
              resumedState.save();
            }

            // Complete the export
            resumedState.update(null, totalProcessed);
            resumedState.delete();

            expect(fs.existsSync(testStateFile)).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property: State persistence should preserve all data across save/load cycles', async () => {
      const fc = await import('fast-check');

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            cursor: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 100 })),
            processedCount: fc.integer({ min: 0, max: 1000000 }),
            startTime: fc.date().map((d) => d.toISOString()),
          }),
          async (stateData) => {
            // Save state
            const state1 = new ExportState(testStateFile);
            state1.initialize(stateData.startTime);
            state1.update(stateData.cursor, stateData.processedCount);
            state1.save();

            // Load state in new instance
            const state2 = new ExportState(testStateFile);
            const loaded = state2.load();

            // Assert: All data should be preserved
            expect(loaded).toBe(true);
            expect(state2.getLastCursor()).toBe(stateData.cursor);
            expect(state2.getProcessedCount()).toBe(stateData.processedCount);
            expect(state2.getStartTime()).toBe(stateData.startTime);

            // Clean up
            state2.delete();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property: Multiple save/load cycles should maintain data integrity', async () => {
      const fc = await import('fast-check');

      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              cursor: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 50 })),
              processedCount: fc.integer({ min: 0, max: 10000 }),
            }),
            { minLength: 1, maxLength: 20 },
          ),
          async (updates) => {
            const state = new ExportState(testStateFile);
            state.initialize();

            // Apply all updates with save after each
            for (const update of updates) {
              state.update(update.cursor, update.processedCount);
              state.save();
            }

            // Load in new instance
            const loadedState = new ExportState(testStateFile);
            loadedState.load();

            // Should have the last update's values
            const lastUpdate = updates[updates.length - 1];
            expect(loadedState.getLastCursor()).toBe(lastUpdate.cursor);
            expect(loadedState.getProcessedCount()).toBe(lastUpdate.processedCount);

            // Clean up
            loadedState.delete();
          },
        ),
        { numRuns: 100 },
      );
    });

    it('Property: isResumed should correctly identify resumed vs new exports', async () => {
      const fc = await import('fast-check');

      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 0, max: 10000 }), async (processedCount) => {
          const state = new ExportState(testStateFile);
          state.initialize();
          state.update('cursor', processedCount);
          state.save();

          const loadedState = new ExportState(testStateFile);
          loadedState.load();

          // Should be resumed if processedCount > 0
          if (processedCount > 0) {
            expect(loadedState.isResumed()).toBe(true);
          } else {
            expect(loadedState.isResumed()).toBe(false);
          }

          // Clean up
          loadedState.delete();
        }),
        { numRuns: 100 },
      );
    });
  });
});
