/**
 * AnalysisOutputWriter class for serializing and writing analysis results to JSON files
 */

import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateAnalysisExport } from './schema-validator.js';
import type { AnalysisExport } from './types.js';

export interface AnalysisOutputWriterOptions {
  outputDirectory?: string;
  filenamePattern?: string;
}

/**
 * AnalysisOutputWriter handles serialization and file output of analysis results
 *
 * Responsibilities:
 * - Serialize enriched bookmarks to JSON
 * - Include analysis metadata (timestamp, categories, scoring method)
 * - Validate output against analysis schema
 * - Write to file with analysis type and timestamp in filename
 * - Handle file collision with unique suffix
 *
 * Validates: Requirements 7.1, 7.3, 7.4, 7.5
 */
export class AnalysisOutputWriter {
  private outputDirectory: string;
  private filenamePattern: string;

  constructor(options: AnalysisOutputWriterOptions = {}) {
    this.outputDirectory = options.outputDirectory ?? './analysis';
    this.filenamePattern = options.filenamePattern ?? 'bookmarks_analyzed_{method}_{timestamp}.json';
  }

  /**
   * Write analysis results to a JSON file
   * @param analysisData - Complete analysis export data with enriched bookmarks
   * @returns Path to the created file
   *
   * Validates: Requirements 7.1, 7.3, 7.4, 7.5
   */
  async write(analysisData: AnalysisExport): Promise<string> {
    // Requirement 7.3: Validate output against analysis schema
    validateAnalysisExport(analysisData);

    // Requirement 7.1: Serialize enriched bookmarks to JSON
    const json = JSON.stringify(analysisData, null, 2);

    // Requirement 7.4: Generate filename with analysis type and timestamp
    const filename = this.generateFilename(analysisData.metadata.scoringMethod);
    const filepath = join(this.outputDirectory, filename);

    // Requirement 7.5: Handle file collision with unique suffix
    const finalPath = await this.resolveFileCollision(filepath);

    // Write to file
    await writeFile(finalPath, json, 'utf-8');

    return finalPath;
  }

  /**
   * Generate filename with analysis method and timestamp
   * @param method - The scoring method used in analysis
   * @returns Filename with method and timestamp
   *
   * Validates: Requirement 7.4 - filename indicates analysis type and timestamp
   */
  private generateFilename(method: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return this.filenamePattern.replace('{method}', method).replace('{timestamp}', timestamp);
  }

  /**
   * Resolve file collision by adding unique suffix
   * @param filepath - Original file path
   * @returns Final file path with unique suffix if needed
   *
   * Validates: Requirement 7.5 - append unique suffix to avoid overwriting
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
