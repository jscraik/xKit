/**
 * BookmarkExporter class for serializing and exporting bookmarks to JSON files
 */

import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateBookmarkExport } from './schema-validator.js';
import type { BookmarkExport, BookmarkRecord, ExportMetadata } from './types.js';

export interface ExporterOptions {
    outputDirectory?: string;
    filenamePattern?: string;
}

/**
 * BookmarkExporter handles serialization and file output of bookmarks
 */
export class BookmarkExporter {
    private outputDirectory: string;
    private filenamePattern: string;

    constructor(options: ExporterOptions = {}) {
        this.outputDirectory = options.outputDirectory ?? './exports';
        this.filenamePattern = options.filenamePattern ?? 'bookmarks_export_{timestamp}.json';
    }

    /**
     * Export bookmarks to a JSON file
     * @param bookmarks - Array of bookmark records to export
     * @param metadata - Export metadata
     * @returns Path to the created file
     */
    async export(bookmarks: BookmarkRecord[], metadata: Omit<ExportMetadata, 'totalCount'>): Promise<string> {
        // Create the export object with complete metadata
        const exportData: BookmarkExport = {
            metadata: {
                ...metadata,
                totalCount: bookmarks.length,
            },
            bookmarks: this.normalizeBookmarks(bookmarks),
        };

        // Validate the export data against the schema
        validateBookmarkExport(exportData);

        // Serialize to JSON
        const json = JSON.stringify(exportData, null, 2);

        // Generate filename with timestamp
        const filename = this.generateFilename();
        const filepath = join(this.outputDirectory, filename);

        // Handle file collision by adding unique suffix
        const finalPath = await this.resolveFileCollision(filepath);

        // Write to file
        await writeFile(finalPath, json, 'utf-8');

        return finalPath;
    }

    /**
     * Normalize bookmarks to ensure null values for missing optional fields
     * Currently all fields are required, but this method provides a place
     * to handle optional fields in the future
     */
    private normalizeBookmarks(bookmarks: BookmarkRecord[]): BookmarkRecord[] {
        return bookmarks.map((bookmark) => ({
            id: bookmark.id,
            url: bookmark.url,
            text: bookmark.text,
            authorUsername: bookmark.authorUsername,
            authorName: bookmark.authorName,
            createdAt: bookmark.createdAt,
            likeCount: bookmark.likeCount,
            retweetCount: bookmark.retweetCount,
            replyCount: bookmark.replyCount,
        }));
    }

    /**
     * Generate filename with timestamp
     */
    private generateFilename(): string {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return this.filenamePattern.replace('{timestamp}', timestamp);
    }

    /**
     * Resolve file collision by adding unique suffix
     * @param filepath - Original file path
     * @returns Final file path with unique suffix if needed
     */
    private async resolveFileCollision(filepath: string): Promise<string> {
        if (!existsSync(filepath)) {
            return filepath;
        }

        // File exists, add unique suffix
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        const suffix = `_${timestamp}_${random}`;

        // Insert suffix before file extension
        const extIndex = filepath.lastIndexOf('.');
        if (extIndex === -1) {
            return `${filepath}${suffix}`;
        }

        return `${filepath.slice(0, extIndex)}${suffix}${filepath.slice(extIndex)}`;
    }

    /**
     * Set the output directory
     */
    setOutputDirectory(directory: string): void {
        this.outputDirectory = directory;
    }

    /**
     * Set the filename pattern
     */
    setFilenamePattern(pattern: string): void {
        this.filenamePattern = pattern;
    }
}
