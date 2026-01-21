/**
 * Degraded mode utilities for migration failure handling
 *
 * When migration fails, the system enters degraded mode:
 * - A .migration-failed marker is written
 * - New bookmarks are written to knowledge_degraded/ instead of knowledge/
 * - The marker contains error details and recovery hints
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Migration failure marker structure
 */
export interface MigrationFailureMarker {
  failedAt: string;
  error: string;
  hint: string;
}

/**
 * Marker file name for degraded mode
 */
const DEGRADED_MARKER = '.migration-failed';

/**
 * Degraded output directory name
 */
const DEGRADED_OUTPUT_DIR = 'knowledge_degraded';

/**
 * Get the path to the degraded mode marker file
 */
function getMarkerPath(basePath: string = '.'): string {
  return join(basePath, DEGRADED_MARKER);
}

/**
 * Mark migration as failed and enter degraded mode
 */
export function markMigrationFailed(error: Error, basePath: string = '.'): void {
  const markerPath = getMarkerPath(basePath);
  const marker: MigrationFailureMarker = {
    failedAt: new Date().toISOString(),
    error: error.message || String(error),
    hint: getRecoveryHint(error),
  };
  writeFileSync(markerPath, JSON.stringify(marker, null, 2), 'utf-8');
  console.error('');
  console.error('!!! MIGRATION FAILED !!!');
  console.error('');
  console.error('Degraded mode activated.');
  console.error('Marker written to: ' + markerPath);
  console.error('Error: ' + marker.error);
  console.error('Hint: ' + marker.hint);
  console.error('');
  console.error('New bookmarks will be written to: ' + getOutputDirectory(basePath));
  console.error('');
}

/**
 * Check if the system is in degraded mode
 */
export function isDegradedMode(basePath: string = '.'): boolean {
  const markerPath = getMarkerPath(basePath);
  return existsSync(markerPath);
}

/**
 * Get the output directory for bookmark writing
 */
export function getOutputDirectory(basePath: string = '.', normalDir: string = 'knowledge'): string {
  if (isDegradedMode(basePath)) {
    return join(basePath, DEGRADED_OUTPUT_DIR);
  }
  return join(basePath, normalDir);
}

/**
 * Clear degraded mode marker and restore normal operation
 */
export function clearDegradedMode(basePath: string = '.'): void {
  const markerPath = getMarkerPath(basePath);
  if (!existsSync(markerPath)) {
    console.warn('No degraded mode marker found. System is already in normal mode.');
    return;
  }
  try {
    const markerContent = readFileSync(markerPath, 'utf-8');
    const marker = JSON.parse(markerContent) as MigrationFailureMarker;
    unlinkSync(markerPath);
    console.log('Degraded mode cleared.');
    console.log('Previous failure: ' + marker.error);
    console.log('Failed at: ' + marker.failedAt);
    console.log('');
    console.log('Normal operation restored. New bookmarks will be written to: knowledge/');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error('Failed to clear degraded mode: ' + errorMessage);
  }
}

/**
 * Get the failure marker contents if degraded mode is active
 */
export function getFailureMarker(basePath: string = '.'): MigrationFailureMarker | null {
  const markerPath = getMarkerPath(basePath);
  if (!existsSync(markerPath)) {
    return null;
  }
  try {
    const content = readFileSync(markerPath, 'utf-8');
    return JSON.parse(content) as MigrationFailureMarker;
  } catch {
    return null;
  }
}

/**
 * Generate recovery hints based on error type
 */
function getRecoveryHint(error: Error): string {
  const message = error.message.toLowerCase();
  if (message.includes('enospc') || message.includes('disk') || message.includes('space')) {
    return 'Disk space issue. Free up space or move knowledge directory to larger drive.';
  }
  if (message.includes('eacces') || message.includes('permission')) {
    return 'Permission denied. Check file/folder permissions and try again with appropriate access.';
  }
  if (message.includes('enoent') || message.includes('not found')) {
    return 'Missing file or directory. Verify knowledge/ directory exists and migration backup is intact.';
  }
  if (message.includes('checksum') || message.includes('verify')) {
    return 'Verification failed. Do NOT use backup. Run migration again from original knowledge/.';
  }
  if (message.includes('timeout')) {
    return 'Operation timed out. File system may be slow or locked. Try again or check for conflicting processes.';
  }
  return 'Check migration.log for details. Review errors and consider manual recovery from backup.';
}
