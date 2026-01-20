/**
 * Worker job handler for parallel processing
 * FIXED: Exported function for piscina/workerpool (no parentPort complexity)
 */

import type { WorkItem, WorkResult } from './work-item.js';

/**
 * Piscina-compatible worker handler
 * This function runs in the worker thread
 */
export async function processWorkItem(data: {
  item: WorkItem;
  sequence: number;
}): Promise<WorkResult> {
  const { item, sequence } = data;

  try {
    // Validate bookmark data before processing
    validateBookmarkData(item.bookmark);

    // Process the bookmark (enrichment, categorization, etc.)
    const result = await processBookmark(item);

    return {
      id: item.id,
      sequence,
      result,
    };
  } catch (error) {
    // Redact sensitive data from errors
    const sanitizedError = sanitizeError(error);

    return {
      id: item.id,
      sequence,
      error: sanitizedError,
    };
  }
}

function validateBookmarkData(bookmark: unknown): void {
  // Basic validation to prevent injection/proliferation
  if (!bookmark || typeof bookmark !== 'object') {
    throw new Error('Invalid bookmark data');
  }
  const record = bookmark as Record<string, unknown>;
  if (typeof record.id !== 'string') {
    throw new Error('Invalid bookmark ID');
  }
  // Add more validation as needed
}

function sanitizeError(error: unknown): Error {
  if (error instanceof Error) {
    // Remove potential sensitive data from stack traces
    const sanitized = new Error(error.message);
    sanitized.name = error.name;
    return sanitized;
  }
  return new Error(String(error));
}

async function processBookmark(item: WorkItem): Promise<any> {
  // For now, return the bookmark as-is
  // In a full implementation, this would:
  // - Call the enricher
  // - Call the categorizer
  // - Return the enriched result

  // TODO: Integrate with BookmarkEnricher and LLMCategorizer
  return {
    ...item.bookmark,
    processed: true,
  };
}
