/**
 * Unified metrics collection for CLI commands
 * Stores metrics locally (no network transmission) for privacy
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CommandMetric {
    /** Command name that was executed */
    command: string;
    /** Unix timestamp when command started */
    timestamp: number;
    /** Duration in milliseconds */
    duration: number;
    /** Whether the command succeeded */
    success: boolean;
    /** Error message if command failed */
    error?: string;
    /** Command arguments (sanitized) */
    args?: Record<string, unknown>;
}

export interface MetricsSummary {
    /** Total number of commands executed */
    totalCommands: number;
    /** Number of successful commands */
    successCount: number;
    /** Number of failed commands */
    errorCount: number;
    /** Average duration in milliseconds */
    averageDuration: number;
    /** Count of commands by type */
    commandsByType: Record<string, number>;
    /** Count of errors by type */
    errorsByType: Record<string, number>;
}

/**
 * MetricsCollector tracks CLI command execution metrics
 * All data is stored locally; no network transmission
 */
export class MetricsCollector {
    private metrics: CommandMetric[] = [];
    private readonly MAX_STORED_METRICS = 1000;
    private storagePath: string;

    constructor(storagePath?: string) {
        // Default to ~/.xkit/metrics.json
        this.storagePath =
            storagePath ?? path.join(os.homedir(), '.xkit', 'metrics.json');

        // Load existing metrics if storage path is provided
        void this.loadFromFile();
    }

    /**
     * Record a command execution
     */
    record(metric: CommandMetric): void {
        this.metrics.push(metric);

        // Prune old metrics to prevent unbounded growth
        if (this.metrics.length > this.MAX_STORED_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_STORED_METRICS);
        }

        // Save to file (async, fire-and-forget)
        void this.saveToFile();
    }

    /**
     * Get summary of all metrics
     */
    getSummary(): MetricsSummary {
        const successCount = this.metrics.filter((m) => m.success).length;
        const errorCount = this.metrics.filter((m) => !m.success).length;

        const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);

        const commandsByType: Record<string, number> = {};
        const errorsByType: Record<string, number> = {};

        for (const metric of this.metrics) {
            commandsByType[metric.command] = (commandsByType[metric.command] || 0) + 1;
            if (metric.error) {
                // Truncate long error messages for grouping
                const errorKey =
                    metric.error.length > 50 ? metric.error.slice(0, 47) + '...' : metric.error;
                errorsByType[errorKey] = (errorsByType[errorKey] || 0) + 1;
            }
        }

        return {
            totalCommands: this.metrics.length,
            successCount,
            errorCount,
            averageDuration: this.metrics.length > 0 ? totalDuration / this.metrics.length : 0,
            commandsByType,
            errorsByType,
        };
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
        void this.saveToFile();
    }

    /**
     * Get recent metrics
     */
    getRecent(count: number): CommandMetric[] {
        return this.metrics.slice(-count);
    }

    /**
     * Get all metrics
     */
    getAll(): CommandMetric[] {
        return [...this.metrics];
    }

    /**
     * Load metrics from file
     */
    private async loadFromFile(): Promise<void> {
        try {
            const data = await fs.readFile(this.storagePath, 'utf-8');
            const parsed = JSON.parse(data) as CommandMetric[];

            // Validate basic structure
            if (Array.isArray(parsed)) {
                this.metrics = parsed.filter(
                    (m): m is CommandMetric =>
                        typeof m.command === 'string' &&
                        typeof m.timestamp === 'number' &&
                        typeof m.duration === 'number' &&
                        typeof m.success === 'boolean'
                );
            }
        } catch {
            // File doesn't exist or is invalid - start fresh
            this.metrics = [];
        }
    }

    /**
     * Save metrics to file
     */
    private async saveToFile(): Promise<void> {
        try {
            const dir = path.dirname(this.storagePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(this.storagePath, JSON.stringify(this.metrics, null, 2), 'utf-8');
        } catch {
            // Fail silently - metrics are optional
        }
    }
}

// Singleton instance (enabled by default - privacy-safe local storage)
// Can be disabled via environment variable
const isEnabled = process.env.XKIT_METRICS_ENABLED !== '0';

export const metrics = isEnabled
    ? new MetricsCollector(process.env.XKIT_METRICS_FILE)
    : null;

/**
 * Helper to wrap a function with metrics collection
 */
export function withMetrics<T extends (...args: unknown[]) => Promise<unknown>>(
    commandName: string,
    fn: T
): T {
    return (async (...args: unknown[]) => {
        const startTime = Date.now();

        try {
            const result = await fn(...args);

            if (metrics) {
                metrics.record({
                    command: commandName,
                    timestamp: startTime,
                    duration: Date.now() - startTime,
                    success: true,
                });
            }

            return result;
        } catch (error) {
            if (metrics) {
                metrics.record({
                    command: commandName,
                    timestamp: startTime,
                    duration: Date.now() - startTime,
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
            throw error;
        }
    }) as T;
}
