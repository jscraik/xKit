/**
 * Checkpoint manager for resume support
 * Enables long-running operations to be interrupted and resumed
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Checkpoint {
    username?: string;
    tweetsProcessed: number;
    articlesExtracted: string[];
    mediaDownloaded: string[];
    lastUpdated: string;
    [key: string]: unknown; // Allow additional custom fields
}

export class CheckpointManager {
    private checkpointPath: string;

    constructor(outputDir: string, identifier: string) {
        this.checkpointPath = join(outputDir, `.checkpoint-${identifier}.json`);
    }

    /**
     * Load checkpoint from disk
     */
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

    /**
     * Save checkpoint to disk
     */
    save(checkpoint: Checkpoint): void {
        checkpoint.lastUpdated = new Date().toISOString();
        writeFileSync(this.checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf8');
    }

    /**
     * Clear checkpoint file
     */
    clear(): void {
        if (existsSync(this.checkpointPath)) {
            try {
                unlinkSync(this.checkpointPath);
            } catch {
                // Ignore errors
            }
        }
    }

    /**
     * Check if checkpoint exists
     */
    exists(): boolean {
        return existsSync(this.checkpointPath);
    }

    /**
     * Get checkpoint path
     */
    getPath(): string {
        return this.checkpointPath;
    }
}
