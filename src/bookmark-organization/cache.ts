/**
 * Real name cache for knowledge reorganization.
 *
 * Provides persistent storage for Twitter handle → real name mappings.
 * Cache file: `.real-name-cache.json` in project root.
 *
 * Evidence: `.ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md:378-425`
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Cache file name in project root */
const CACHE_FILE = '.real-name-cache.json';

/** Current cache format version */
const CACHE_VERSION = 1;

/**
 * Real name cache structure
 */
export interface RealNameCache {
  version: number;
  lastUpdated: string; // ISO timestamp
  entries: Record<string, string>; // "@doodlestein": "Doug"
}

/**
 * Get the cache file path (project root)
 */
function getCachePath(): string {
  return join(process.cwd(), CACHE_FILE);
}

/**
 * Load real name cache from disk.
 *
 * Creates a new empty cache if the file doesn't exist or is corrupted.
 *
 * @returns RealNameCache object
 */
export function loadRealNameCache(): RealNameCache {
  const cachePath = getCachePath();

  if (!existsSync(cachePath)) {
    return {
      version: CACHE_VERSION,
      lastUpdated: new Date().toISOString(),
      entries: {}
    };
  }

  try {
    const cache = JSON.parse(readFileSync(cachePath, 'utf-8')) as RealNameCache;

    // Validate cache structure
    if (typeof cache.version !== 'number' ||
        typeof cache.lastUpdated !== 'string' ||
        typeof cache.entries !== 'object' ||
        cache.entries === null) {
      throw new Error('Invalid cache structure');
    }

    return cache;
  } catch (error) {
    console.warn(`Failed to load cache, starting fresh: ${error}`);
    return {
      version: CACHE_VERSION,
      lastUpdated: new Date().toISOString(),
      entries: {}
    };
  }
}

/**
 * Save real name cache to disk.
 *
 * Updates the lastUpdated timestamp automatically.
 *
 * @param cache - Cache object to save
 */
export function saveRealNameCache(cache: RealNameCache): void {
  cache.lastUpdated = new Date().toISOString();
  const cachePath = getCachePath();
  writeFileSync(cachePath, JSON.stringify(cache, null, 2));
}

/**
 * Get real name for handle from cache.
 *
 * Normalizes the handle to include @ prefix for lookup.
 *
 * @param handle - Twitter handle (with or without @ prefix)
 * @param cache - Cache object to search
 * @returns Real name or undefined if not found
 */
export function getRealName(handle: string, cache: RealNameCache): string | undefined {
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  return cache.entries[cleanHandle];
}

/**
 * Add or update real name in cache.
 *
 * Normalizes the handle to include @ prefix and saves to disk.
 *
 * @param handle - Twitter handle (with or without @ prefix)
 * @param realName - Real name to associate with handle
 * @param cache - Cache object to update
 */
export function setRealName(handle: string, realName: string, cache: RealNameCache): void {
  const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
  cache.entries[cleanHandle] = realName;
  saveRealNameCache(cache);
}
