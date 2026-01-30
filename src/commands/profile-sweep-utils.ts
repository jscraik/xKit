/**
 * Utility functions for profile sweep command
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Progress tracker for long-running operations
 */
export class ProgressTracker {
    private current = 0;
    private total: number;
    private label: string;
    private startTime: number;

    constructor(total: number, label: string) {
        this.total = total;
        this.label = label;
        this.startTime = Date.now();
    }

    increment(): void {
        this.current++;
        this.render();
    }

    private render(): void {
        const percent = Math.round((this.current / this.total) * 100);
        const elapsed = Math.round((Date.now() - this.startTime) / 1000);
        const rate = this.current / elapsed || 0;
        const eta = this.current > 0 ? Math.round((this.total - this.current) / rate) : 0;

        process.stdout.write(
            `\r   ${this.label}: ${this.current}/${this.total} (${percent}%) - ${elapsed}s elapsed, ~${eta}s remaining`
        );

        if (this.current === this.total) {
            process.stdout.write('\n');
        }
    }

    complete(): void {
        this.current = this.total;
        this.render();
    }
}

/**
 * Checkpoint manager for resume support
 */
export interface Checkpoint {
    username: string;
    tweetsProcessed: number;
    articlesExtracted: string[];
    mediaDownloaded: string[];
    lastUpdated: string;
}

export class CheckpointManager {
    private checkpointPath: string;

    constructor(artifactsDir: string, username: string) {
        this.checkpointPath = join(artifactsDir, `.checkpoint-${username}.json`);
    }

    load(): Checkpoint | null {
        if (!existsSync(this.checkpointPath)) {
            return null;
        }

        try {
            const data = readFileSync(this.checkpointPath, 'utf8');
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    save(checkpoint: Checkpoint): void {
        checkpoint.lastUpdated = new Date().toISOString();
        writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf8');
    }

    clear(): void {
        if (existsSync(this.checkpointPath)) {
            try {
                const { unlinkSync } = require('node:fs');
                unlinkSync(this.checkpointPath);
            } catch {
                // Ignore errors
            }
        }
    }
}

/**
 * Error logger for tracking failures
 */
export interface ErrorLog {
    timestamp: string;
    operation: string;
    url?: string;
    error: string;
}

export class ErrorLogger {
    private errors: ErrorLog[] = [];
    private logPath: string;

    constructor(artifactsDir: string) {
        this.logPath = join(artifactsDir, 'errors.log');
    }

    log(operation: string, error: string, url?: string): void {
        this.errors.push({
            timestamp: new Date().toISOString(),
            operation,
            url,
            error,
        });
    }

    save(): void {
        if (this.errors.length === 0) return;

        const lines = this.errors.map(
            (e) => `[${e.timestamp}] ${e.operation}${e.url ? ` - ${e.url}` : ''}: ${e.error}`
        );

        writeFileSync(this.logPath, lines.join('\n'), 'utf8');
    }

    getCount(): number {
        return this.errors.length;
    }

    getSummary(): Record<string, number> {
        const summary: Record<string, number> = {};
        for (const error of this.errors) {
            summary[error.operation] = (summary[error.operation] || 0) + 1;
        }
        return summary;
    }
}

/**
 * Batch processor with concurrency control
 */
export async function processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
        batchSize?: number;
        onProgress?: (completed: number, total: number) => void;
    } = {}
): Promise<R[]> {
    const { batchSize = 5, onProgress } = options;
    const results: R[] = [];
    let completed = 0;

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch.map(processor));

        for (const result of batchResults) {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            }
            completed++;
            if (onProgress) {
                onProgress(completed, items.length);
            }
        }
    }

    return results;
}

/**
 * Deduplication helper
 */
export function deduplicateByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const item of items) {
        const key = keyFn(item);
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
        }
    }

    return unique;
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: {
        maxRetries?: number;
        initialDelay?: number;
        maxDelay?: number;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> {
    const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000, onRetry } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            if (attempt < maxRetries) {
                const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
                if (onRetry) {
                    onRetry(attempt + 1, lastError);
                }
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError!;
}
