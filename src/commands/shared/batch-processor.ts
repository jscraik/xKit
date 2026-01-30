/**
 * Batch processing utilities
 * Process items in parallel batches with concurrency control
 */

export interface BatchProcessorOptions {
    batchSize?: number;
    onProgress?: (completed: number, total: number) => void;
    onError?: (error: Error, item: unknown) => void;
    continueOnError?: boolean;
}

/**
 * Process items in batches with concurrency control
 */
export async function processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: BatchProcessorOptions = {}
): Promise<R[]> {
    const { batchSize = 5, onProgress, onError, continueOnError = true } = options;
    const results: R[] = [];
    let completed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(processor));

        for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            completed++;

            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else if (onError) {
                onError(result.reason, batch[j]);
            }

            if (!continueOnError && result.status === 'rejected') {
                throw result.reason;
            }

            if (onProgress) {
                onProgress(completed, items.length);
            }
        }
    }

    return results;
}

/**
 * Process items in batches and return both successes and failures
 */
export async function processBatchWithResults<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: BatchProcessorOptions = {}
): Promise<{
    successes: Array<{ item: T; result: R }>;
    failures: Array<{ item: T; error: Error }>;
}> {
    const { batchSize = 5, onProgress } = options;
    const successes: Array<{ item: T; result: R }> = [];
    const failures: Array<{ item: T; error: Error }> = [];
    let completed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(processor));

        for (let j = 0; j < batchResults.length; j++) {
            const result = batchResults[j];
            const item = batch[j];
            completed++;

            if (result.status === 'fulfilled') {
                successes.push({ item, result: result.value });
            } else {
                failures.push({ item, error: result.reason });
            }

            if (onProgress) {
                onProgress(completed, items.length);
            }
        }
    }

    return { successes, failures };
}

/**
 * Process items sequentially (no parallelism)
 */
export async function processSequentially<T, R>(
    items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: { onProgress?: (completed: number, total: number) => void } = {}
): Promise<R[]> {
    const { onProgress } = options;
    const results: R[] = [];

    for (let i = 0; i < items.length; i++) {
        const result = await processor(items[i], i);
        results.push(result);

        if (onProgress) {
            onProgress(i + 1, items.length);
        }
    }

    return results;
}

/**
 * Split array into chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}
