/**
 * Progress tracker for long-running operations
 * Provides real-time feedback with ETA calculation
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

    /**
     * Get current progress as a fraction (0-1)
     */
    getProgress(): number {
        return this.current / this.total;
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedSeconds(): number {
        return Math.round((Date.now() - this.startTime) / 1000);
    }

    /**
     * Get processing rate (items per second)
     */
    getRate(): number {
        const elapsed = (Date.now() - this.startTime) / 1000;
        return this.current / elapsed || 0;
    }
}
