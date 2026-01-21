/**
 * Disk space utilities for migration pre-flight checks
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Calculate total size of a directory in bytes
 * @param dir - Directory path to scan
 * @returns Total size in bytes
 */
export async function getDirectorySize(dir: string): Promise<number> {
  let total = 0;

  async function scan(path: string): Promise<void> {
    try {
      const entries = await readdir(path, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(path, entry.name);

        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          const stats = await stat(fullPath);
          total += stats.size;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Could not scan ${path}: ${errorMessage}`);
    }
  }

  await scan(dir);
  return total;
}

/**
 * Check available disk space before migration
 * @param directory - Directory path to check
 * @param requiredBytes - Required space in bytes
 * @returns Object with available bytes and sufficiency flag
 * @throws Error if insufficient disk space
 */
export async function checkDiskSpace(
  directory: string,
  requiredBytes: number
): Promise<{ available: number; sufficient: boolean }> {
  try {
    // Dynamic import for statvfs (Unix-only, not in TypeScript types)
    const fs = await import('node:fs/promises');
    const statvfs = (fs as any).statvfs;

    if (!statvfs) {
      throw { code: 'ENOSYS' };
    }

    const stats = await statvfs(directory);
    const available = stats.available * stats.frsize;

    // Require 2.5x the required space (original + backup + margin)
    const needed = requiredBytes * 2.5;
    const sufficient = available >= needed;

    if (!sufficient) {
      const availableGB = (available / 1e9).toFixed(2);
      const neededGB = (needed / 1e9).toFixed(2);
      throw new Error(
        `Insufficient disk space for migration.\n` +
          `Available: ${availableGB} GB\n` +
          `Required: ${neededGB} GB (2.5x for original + backup + margin)\n` +
          `Directory: ${directory}`
      );
    }

    return { available, sufficient };
  } catch (error) {
    const err = error as NodeJS.ErrnoException;

    // Fallback for Windows or systems without statvfs
    if (err.code === 'ENOSYS' || err.code === 'ENOENT') {
      console.warn('Warning: statvfs not available on this platform. Skipping disk space check.');
      return { available: 0, sufficient: true };
    }

    throw error;
  }
}

/**
 * Format bytes to human-readable string
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "1.23 GB")
 */
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
}
