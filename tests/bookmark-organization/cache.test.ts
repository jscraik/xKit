/**
 * Tests for real name cache functions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadRealNameCache,
  saveRealNameCache,
  getRealName,
  setRealName,
  type RealNameCache
} from '../../src/bookmark-organization/cache';
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const CACHE_FILE = '.real-name-cache.json';

describe('loadRealNameCache', () => {
  afterEach(() => {
    // Clean up cache file after each test
    const cachePath = join(process.cwd(), CACHE_FILE);
    if (existsSync(cachePath)) {
      unlinkSync(cachePath);
    }
  });

  it('should create new cache if file does not exist', () => {
    // Ensure cache doesn't exist
    const cachePath = join(process.cwd(), CACHE_FILE);
    if (existsSync(cachePath)) {
      unlinkSync(cachePath);
    }

    const cache = loadRealNameCache();

    expect(cache.version).toBe(1);
    expect(cache.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(cache.entries).toEqual({});
  });

  it('should load existing cache from disk', () => {
    const testCache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: {
        '@doodlestein': 'Doug',
        '@Vjeux': 'James V'
      }
    };

    const cachePath = join(process.cwd(), CACHE_FILE);
    require('node:fs').writeFileSync(cachePath, JSON.stringify(testCache, null, 2));

    const cache = loadRealNameCache();

    expect(cache.version).toBe(1);
    expect(cache.entries).toEqual({
      '@doodlestein': 'Doug',
      '@Vjeux': 'James V'
    });
  });

  it('should return empty cache if file is corrupted', () => {
    const cachePath = join(process.cwd(), CACHE_FILE);
    require('node:fs').writeFileSync(cachePath, 'invalid json {');

    const cache = loadRealNameCache();

    expect(cache.version).toBe(1);
    expect(cache.entries).toEqual({});
  });

  it('should return empty cache if structure is invalid', () => {
    const invalidCache = { version: 'not a number', lastUpdated: '2026-01-20T12:00:00.000Z', entries: {} };
    const cachePath = join(process.cwd(), CACHE_FILE);
    require('node:fs').writeFileSync(cachePath, JSON.stringify(invalidCache));

    const cache = loadRealNameCache();

    expect(cache.version).toBe(1);
    expect(cache.entries).toEqual({});
  });
});

describe('saveRealNameCache', () => {
  afterEach(() => {
    // Clean up cache file after each test
    const cachePath = join(process.cwd(), CACHE_FILE);
    if (existsSync(cachePath)) {
      unlinkSync(cachePath);
    }
  });

  it('should save cache to disk and update timestamp', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: { '@doodlestein': 'Doug' }
    };

    saveRealNameCache(cache);

    const cachePath = join(process.cwd(), CACHE_FILE);
    expect(existsSync(cachePath)).toBe(true);

    // Verify file contents
    const saved = JSON.parse(require('node:fs').readFileSync(cachePath, 'utf-8'));
    expect(saved.entries).toEqual({ '@doodlestein': 'Doug' });

    // Verify timestamp was updated (should be different)
    expect(saved.lastUpdated).not.toBe('2026-01-20T12:00:00.000Z');
  });
});

describe('getRealName', () => {
  it('should return real name for handle with @ prefix', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: { '@doodlestein': 'Doug' }
    };

    const result = getRealName('@doodlestein', cache);
    expect(result).toBe('Doug');
  });

  it('should return real name for handle without @ prefix', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: { '@doodlestein': 'Doug' }
    };

    const result = getRealName('doodlestein', cache);
    expect(result).toBe('Doug');
  });

  it('should return undefined for unknown handle', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: { '@doodlestein': 'Doug' }
    };

    const result = getRealName('@unknown', cache);
    expect(result).toBeUndefined();
  });

  it('should be case-sensitive for handle lookups', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: { '@Doodlestein': 'Doug' }
    };

    expect(getRealName('@Doodlestein', cache)).toBe('Doug');
    expect(getRealName('@doodlestein', cache)).toBeUndefined();
  });
});

describe('setRealName', () => {
  afterEach(() => {
    // Clean up cache file after each test
    const cachePath = join(process.cwd(), CACHE_FILE);
    if (existsSync(cachePath)) {
      unlinkSync(cachePath);
    }
  });

  it('should add new entry to cache', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: {}
    };

    setRealName('doodlestein', 'Doug', cache);

    expect(cache.entries['@doodlestein']).toBe('Doug');
  });

  it('should normalize handle to include @ prefix', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: {}
    };

    setRealName('doodlestein', 'Doug', cache);
    setRealName('@Vjeux', 'James V', cache);

    expect(cache.entries).toEqual({
      '@doodlestein': 'Doug',
      '@Vjeux': 'James V'
    });
  });

  it('should update existing entry', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: { '@doodlestein': 'Douglas' }
    };

    setRealName('@doodlestein', 'Doug', cache);

    expect(cache.entries['@doodlestein']).toBe('Doug');
  });

  it('should save cache to disk after updating', () => {
    const cache: RealNameCache = {
      version: 1,
      lastUpdated: '2026-01-20T12:00:00.000Z',
      entries: {}
    };

    setRealName('doodlestein', 'Doug', cache);

    const cachePath = join(process.cwd(), CACHE_FILE);
    expect(existsSync(cachePath)).toBe(true);

    const saved = JSON.parse(require('node:fs').readFileSync(cachePath, 'utf-8'));
    expect(saved.entries).toEqual({ '@doodlestein': 'Doug' });
  });
});

describe('Integration: cache operations', () => {
  afterEach(() => {
    // Clean up cache file after each test
    const cachePath = join(process.cwd(), CACHE_FILE);
    if (existsSync(cachePath)) {
      unlinkSync(cachePath);
    }
  });

  it('should persist cache across load and save cycles', () => {
    // First cache
    const cache1 = loadRealNameCache();
    setRealName('doodlestein', 'Doug', cache1);
    setRealName('Vjeux', 'James V', cache1);

    // Load again
    const cache2 = loadRealNameCache();

    expect(getRealName('doodlestein', cache2)).toBe('Doug');
    expect(getRealName('@Vjeux', cache2)).toBe('James V');
  });

  it('should handle multiple entries correctly', () => {
    const cache = loadRealNameCache();

    const entries = [
      { handle: 'doodlestein', name: 'Doug' },
      { handle: 'Vjeux', name: 'James V' },
      { handle: 'brian_lovin', name: 'Brian' },
      { handle: 'rseroter', name: 'Richard' }
    ];

    for (const entry of entries) {
      setRealName(entry.handle, entry.name, cache);
    }

    // Verify all entries
    for (const entry of entries) {
      expect(getRealName(entry.handle, cache)).toBe(entry.name);
    }

    expect(Object.keys(cache.entries).length).toBe(4);
  });
});
