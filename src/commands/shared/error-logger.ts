/**
 * Error logger for tracking failures during command execution
 * Provides structured error logging with operation categorization
 */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface ErrorLog {
    timestamp: string;
    operation: string;
    url?: string;
    error: string;
}

export class ErrorLogger {
    private errors: ErrorLog[] = [];
    private logPath: string;

    constructor(outputDir: string, filename = 'errors.log') {
        this.logPath = join(outputDir, filename);
    }

    /**
     * Log an error with operation context
     */
    log(operation: string, error: string, url?: string): void {
        this.errors.push({
            timestamp: new Date().toISOString(),
            operation,
            url,
            error,
        });
    }

    /**
     * Save errors to log file
     */
    save(): void {
        if (this.errors.length === 0) return;

        const lines = this.errors.map(
            (e) => `[${e.timestamp}] ${e.operation}${e.url ? ` - ${e.url}` : ''}: ${e.error}`
        );

        writeFileSync(this.logPath, lines.join('\n'), 'utf8');
    }

    /**
     * Get total error count
     */
    getCount(): number {
        return this.errors.length;
    }

    /**
     * Get error summary grouped by operation
     */
    getSummary(): Record<string, number> {
        const summary: Record<string, number> = {};
        for (const error of this.errors) {
            summary[error.operation] = (summary[error.operation] || 0) + 1;
        }
        return summary;
    }

    /**
     * Get all errors
     */
    getErrors(): ErrorLog[] {
        return [...this.errors];
    }

    /**
     * Check if log file exists
     */
    exists(): boolean {
        return existsSync(this.logPath);
    }

    /**
     * Clear all logged errors
     */
    clear(): void {
        this.errors = [];
    }

    /**
     * Get errors for a specific operation
     */
    getErrorsForOperation(operation: string): ErrorLog[] {
        return this.errors.filter((e) => e.operation === operation);
    }
}
