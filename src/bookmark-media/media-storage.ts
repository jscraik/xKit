/**
 * Media Storage - Local file management for bookmark media
 *
 * Handles filesystem operations for storing and managing downloaded media files.
 * Provides graceful degradation: logs errors but never throws for non-critical failures.
 */

import { access, constants, mkdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { logger } from '../observability/logger.js';

/**
 * Result for filesystem operations
 */
export interface StorageResult {
  success: boolean;
  path: string;
  error?: string;
}

/**
 * MediaStorage - Manages local file storage for bookmark media
 *
 * Provides utility methods for:
 * - Directory creation with recursive support
 * - Filename generation from URLs (delegates to MediaDownloader pattern)
 * - File existence checking
 * - File deletion
 *
 * All operations use graceful degradation: errors are logged but not thrown.
 *
 * @example
 * ```ts
 * const storage = new MediaStorage();
 * await storage.ensureDir('/path/to/media');
 * const exists = await storage.exists('/path/to/file.jpg');
 * await storage.delete('/path/to/old-file.jpg');
 * ```
 */
export class MediaStorage {
  /**
   * Ensure a directory exists, creating it if necessary
   *
   * Creates the directory and any missing parent directories recursively.
   * If the directory already exists, this is a no-op.
   *
   * @param path - Absolute path to directory
   * @returns Promise that resolves when directory exists
   *
   * @example
   * ```ts
   * await storage.ensureDir('/Users/user/media/images');
   * ```
   */
  async ensureDir(path: string): Promise<void> {
    try {
      await mkdir(path, { recursive: true });
      logger.debug({ path }, 'Directory ensured');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ path, error: message }, 'Failed to ensure directory');
    }
  }

  /**
   * Generate a safe filename from a URL
   *
   * Uses the URL hash pattern from MediaDownloader for consistent filenames.
   * This ensures the same URL always generates the same filename.
   *
   * @param url - Media URL
   * @param extension - File extension (e.g., 'jpg', 'mp4')
   * @returns Safe filename (e.g., 'a1b2c3d4e5f6.jpg')
   *
   * @example
   * ```ts
   * const filename = storage.getFilename(url, 'jpg');
   * // Returns: 'a1b2c3d4e5f6.jpg'
   * ```
   */
  getFilename(url: string, extension: string): string {
    // Extract the hash generation logic from MediaDownloader
    // This uses SHA-256 hash of the URL for consistent filenames
    const hash = createHash('sha256').update(url).digest('hex').substring(0, 12);
    return `${hash}.${extension}`;
  }

  /**
   * Check if a file exists at the given path
   *
   * Uses fs.access with F_OK flag to check file existence.
   * Returns false for any error (file not found, permission denied, etc).
   *
   * @param path - Absolute path to file
   * @returns Promise resolving to true if file exists, false otherwise
   *
   * @example
   * ```ts
   * const exists = await storage.exists('/path/to/file.jpg');
   * if (exists) {
   *   console.log('File already downloaded');
   * }
   * ```
   */
  async exists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      // File doesn't exist or we don't have access
      return false;
    }
  }

  /**
   * Delete a file at the given path
   *
   * Removes the file from the filesystem. If the file doesn't exist,
   * this is considered a success (no-op).
   *
   * @param path - Absolute path to file to delete
   * @returns Promise resolving to storage result
   *
   * @example
   * ```ts
   * const result = await storage.delete('/path/to/old-file.jpg');
   * if (result.success) {
   *   console.log('File deleted successfully');
   * }
   * ```
   */
  async delete(path: string): Promise<StorageResult> {
    try {
      await unlink(path);
      logger.debug({ path }, 'File deleted successfully');
      return { success: true, path };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ path, error: message }, 'Failed to delete file');
      return { success: false, path, error: message };
    }
  }

  /**
   * Check if a directory exists at the given path
   *
   * Uses fs.access with F_OK flag to check directory existence.
   * Returns false for any error (directory not found, permission denied, etc).
   *
   * @param path - Absolute path to directory
   * @returns Promise resolving to true if directory exists, false otherwise
   *
   * @example
   * ```ts
   * const exists = await storage.dirExists('/path/to/media');
   * if (!exists) {
   *   await storage.ensureDir('/path/to/media');
   * }
   * ```
   */
  async dirExists(path: string): Promise<boolean> {
    try {
      await access(path, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the parent directory of a file path
   *
   * Utility method for extracting the directory portion of a file path.
   * Useful for ensuring the parent directory exists before file operations.
   *
   * @param filePath - Absolute path to file
   * @returns Parent directory path
   *
   * @example
   * ```ts
   * const dir = storage.getParentDir('/path/to/file.jpg');
   * // Returns: '/path/to'
   * await storage.ensureDir(dir);
   * ```
   */
  getParentDir(filePath: string): string {
    return dirname(filePath);
  }
}
