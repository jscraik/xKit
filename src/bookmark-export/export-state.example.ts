/**
 * Example usage of ExportState class
 * This demonstrates how to use ExportState for resumable exports
 */

import { ExportState } from './export-state.js';

/**
 * Example: Basic export with state management
 */
export function basicExportExample() {
    const state = new ExportState();

    // Initialize new export
    state.initialize();

    // Simulate processing bookmarks
    state.update('cursor_page_1', 50);
    state.save();

    state.update('cursor_page_2', 100);
    state.save();

    // Export complete
    state.update(null, 150);
    state.delete(); // Clean up state file
}

/**
 * Example: Resume interrupted export
 */
export function resumeExportExample() {
    const state = new ExportState();

    // Check if there's a previous export to resume
    if (state.exists()) {
        console.log('Found existing export state, resuming...');
        state.load();

        console.log(`Resuming from cursor: ${state.getLastCursor()}`);
        console.log(`Already processed: ${state.getProcessedCount()} bookmarks`);
        console.log(`Started at: ${state.getStartTime()}`);

        // Continue from last cursor
        // ... fetch more bookmarks starting from state.getLastCursor()
    } else {
        console.log('Starting new export...');
        state.initialize();
    }

    // Process bookmarks and update state
    // ... your export logic here
}

/**
 * Example: Complete export workflow with error handling
 */
export async function completeExportWorkflow() {
    const state = new ExportState();

    try {
        // Try to resume or start new
        if (state.exists()) {
            state.load();
            console.log(`Resuming export from ${state.getProcessedCount()} bookmarks`);
        } else {
            state.initialize();
            console.log('Starting new export');
        }

        let cursor = state.getLastCursor();
        let processedCount = state.getProcessedCount();

        // Simulate pagination
        while (cursor !== null || processedCount === 0) {
            // Fetch bookmarks from API (simulated)
            const { bookmarks, nextCursor } = await fetchBookmarksFromAPI(cursor);

            processedCount += bookmarks.length;
            cursor = nextCursor;

            // Update and save state after each page
            state.update(cursor, processedCount);
            state.save();

            console.log(`Processed ${processedCount} bookmarks so far...`);

            if (cursor === null) {
                break; // No more pages
            }
        }

        // Export complete, clean up state
        console.log(`Export complete! Total: ${processedCount} bookmarks`);
        state.delete();
    } catch (error) {
        console.error('Export failed:', error);
        console.log('State saved. You can resume later.');
        // State file remains for resume
    }
}

// Mock API function for example
async function fetchBookmarksFromAPI(cursor: string | null): Promise<{
    bookmarks: unknown[];
    nextCursor: string | null;
}> {
    // Simulated API call
    return {
        bookmarks: new Array(50).fill({}),
        nextCursor: cursor === null ? 'cursor_1' : null,
    };
}
