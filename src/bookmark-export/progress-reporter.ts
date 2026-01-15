/**
 * ProgressReporter class for tracking and reporting progress during export and analysis operations
 * Validates Requirements 9.1, 9.2, 9.3, 2.4
 */

export interface ProgressOptions {
    /** Total number of items to process */
    total: number;
    /** Interval in milliseconds between progress updates (default: 1000ms) */
    updateInterval?: number;
    /** Whether to display progress updates (default: true) */
    displayProgress?: boolean;
}

export interface CompletionSummary {
    /** Total number of items processed */
    total: number;
    /** Duration in milliseconds */
    duration: number;
    /** Output file location */
    fileLocation: string;
}

/**
 * ProgressReporter handles progress tracking and reporting for long-running operations
 */
export class ProgressReporter {
    private total: number;
    private processed = 0;
    private startTime: number;
    private lastUpdateTime = 0;
    private updateInterval: number;
    private displayProgress: boolean;

    constructor(options: ProgressOptions) {
        this.total = options.total;
        this.updateInterval = options.updateInterval ?? 1000;
        this.displayProgress = options.displayProgress ?? true;
        this.startTime = Date.now();
    }

    /**
     * Increment the processed count and emit progress update if interval has passed
     * Requirement 9.1: Output progress updates at regular intervals
     */
    increment(): void {
        this.processed++;

        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;

        // Emit progress update if interval has passed
        if (this.displayProgress && timeSinceLastUpdate >= this.updateInterval) {
            this.emitProgress();
            this.lastUpdateTime = now;
        }
    }

    /**
     * Set the processed count directly
     */
    setProcessed(count: number): void {
        this.processed = count;
    }

    /**
     * Get the current processed count
     */
    getProcessed(): number {
        return this.processed;
    }

    /**
     * Get the total count
     */
    getTotal(): number {
        return this.total;
    }

    /**
     * Emit a progress update showing processed count and estimated time remaining
     * Requirement 9.2: Display processed count and estimated time remaining
     */
    private emitProgress(): void {
        const elapsed = Date.now() - this.startTime;
        const rate = this.processed / elapsed; // items per millisecond
        const remaining = this.total - this.processed;
        const estimatedTimeRemaining = remaining > 0 ? remaining / rate : 0;

        const progressMessage = this.formatProgressMessage(
            this.processed,
            this.total,
            estimatedTimeRemaining,
        );

        console.log(progressMessage);
    }

    /**
     * Format progress message with processed count and estimated time remaining
     */
    private formatProgressMessage(
        processed: number,
        total: number,
        estimatedTimeMs: number,
    ): string {
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
        const timeRemaining = this.formatDuration(estimatedTimeMs);

        return `Progress: ${processed}/${total} (${percentage}%) - Estimated time remaining: ${timeRemaining}`;
    }

    /**
     * Display completion summary with total items, duration, and file location
     * Requirement 9.3: Display completion summary with total, duration, file location
     * Requirement 2.4: Log the total number of bookmarks exported
     */
    displayCompletionSummary(fileLocation: string): CompletionSummary {
        const duration = Date.now() - this.startTime;
        const summary: CompletionSummary = {
            total: this.processed,
            duration,
            fileLocation,
        };

        if (this.displayProgress) {
            const summaryMessage = this.formatCompletionSummary(summary);
            console.log(summaryMessage);
        }

        return summary;
    }

    /**
     * Format completion summary message
     */
    private formatCompletionSummary(summary: CompletionSummary): string {
        const durationStr = this.formatDuration(summary.duration);

        return [
            '\n=== Export Complete ===',
            `Total items processed: ${summary.total}`,
            `Duration: ${durationStr}`,
            `Output file: ${summary.fileLocation}`,
            '======================\n',
        ].join('\n');
    }

    /**
     * Format duration in milliseconds to human-readable string
     */
    private formatDuration(ms: number): string {
        if (ms < 1000) {
            return `${Math.round(ms)}ms`;
        }

        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        if (minutes < 60) {
            return `${minutes}m ${remainingSeconds}s`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;

        return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
    }

    /**
     * Force emit a progress update regardless of interval
     */
    forceUpdate(): void {
        if (this.displayProgress) {
            this.emitProgress();
            this.lastUpdateTime = Date.now();
        }
    }

    /**
     * Reset the progress reporter for a new operation
     */
    reset(total?: number): void {
        this.processed = 0;
        this.startTime = Date.now();
        this.lastUpdateTime = 0;
        if (total !== undefined) {
            this.total = total;
        }
    }
}
