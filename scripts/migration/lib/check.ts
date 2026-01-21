/**
 * Pre-flight checks for migration
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { checkDiskSpace, formatBytes, getDirectorySize } from './disk.js';

/**
 * Result of pre-flight checks
 */
export interface PreflightCheck {
  directorySize: number;
  availableSpace: number;
  sufficient: boolean;
  fileCount: number;
}

/**
 * Count files in a directory recursively
 * @param dir - Directory path to count files in
 * @returns Number of files
 */
function countFiles(dir: string): number {
  let count = 0;

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        count += countFiles(fullPath);
      } else if (entry.isFile()) {
        count++;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Warning: Could not count files in ${dir}: ${errorMessage}`);
  }

  return count;
}

/**
 * Run pre-flight checks before migration
 * @param knowledgeDir - Path to knowledge directory
 * @returns PreflightCheck result
 * @throws Error if checks fail
 */
export async function preFlightChecks(knowledgeDir: string): Promise<PreflightCheck> {
  console.log('Running pre-flight checks...');
  console.log(`Target directory: ${knowledgeDir}`);
  console.log('');

  // Check directory size
  const dirSize = await getDirectorySize(knowledgeDir);
  const sizeMB = (dirSize / 1e6).toFixed(2);
  const sizeFormatted = formatBytes(dirSize);
  console.log(`Directory size: ${sizeFormatted} (${sizeMB} MB)`);

  // Count files
  const fileCount = countFiles(knowledgeDir);
  console.log(`Files to migrate: ${fileCount}`);
  console.log('');

  // Check disk space
  const { available, sufficient } = await checkDiskSpace(knowledgeDir, dirSize);
  const availableFormatted = formatBytes(available);
  console.log(`Available disk space: ${availableFormatted}`);

  if (!sufficient) {
    throw new Error('Insufficient disk space for migration');
  }

  console.log('✓ Disk space sufficient');
  console.log('');

  // Summary
  console.log('=== Pre-flight Summary ===');
  console.log(`Directory: ${knowledgeDir}`);
  console.log(`Size: ${sizeFormatted}`);
  console.log(`Files: ${fileCount}`);
  console.log(`Available space: ${availableFormatted}`);
  console.log(`Status: ✓ Ready to migrate`);
  console.log('');

  return {
    directorySize: dirSize,
    availableSpace: available,
    sufficient: true,
    fileCount,
  };
}
