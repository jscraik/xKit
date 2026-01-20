/**
 * Cache management command
 * Provides cache statistics, clearing, and control
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { CacheManager, getDefaultCachePath, cacheExists } from '../cache/cache-manager.js';

interface CacheOptions {
  stats?: boolean;
  clear?: boolean;
  json?: boolean;
}

/**
 * Register cache management commands
 */
export function registerCacheCommand(program: Command, ctx: CliContext): void {
  const cacheCmd = program
    .command('cache')
    .description('Manage SQLite cache for extracts and summaries')
    .option('--stats', 'Show cache statistics')
    .option('--clear', 'Clear all cached data')
    .option('--json', 'Output as JSON')
    .action(async (options: CacheOptions) => {
      await handleCacheCommand(options, ctx);
    });
}

/**
 * Handle cache command
 */
async function handleCacheCommand(options: CacheOptions, ctx: CliContext): Promise<void> {
  // Show stats by default or if requested
  if (options.stats || (!options.clear && !options.stats)) {
    showCacheStats(ctx, options.json ?? false);
  }

  // Clear cache if requested
  if (options.clear) {
    clearCache(ctx);
  }
}

/**
 * Show cache statistics
 */
function showCacheStats(ctx: CliContext, asJson: boolean): void {
  if (!cacheExists()) {
    const msg = 'Cache does not exist yet. Run xkit archive to create cache.';
    if (asJson) {
      console.log(JSON.stringify({ error: msg }, null, 2));
    } else {
      console.log(`${ctx.p('warn')}${msg}`);
    }
    return;
  }

  const cacheManager = new CacheManager();
  const stats = cacheManager.getStats();

  if (asJson) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(ctx.colors.section('Cache Statistics'));
    console.log(ctx.colors.muted('────────────────────'));
    console.log('');
    console.log('Database:');
    console.log(`   Location: ${getDefaultCachePath()}`);
    console.log(`   Size: ${stats.sizeFormatted} (cap: 512 MB)`);
    console.log('');
    console.log('Entries:');
    console.log(`   Total: ${stats.totalEntries.toLocaleString()}`);
    const hitRatePercent = (stats.hitRate * 100).toFixed(1);
    console.log(`   Hits: ${stats.cacheHits.toLocaleString()} (${ctx.colors.accent(hitRatePercent)}% hit rate)`);
    console.log(`   Misses: ${stats.cacheMisses.toLocaleString()}`);
    console.log('');
    console.log('Performance:');
    if (stats.totalEntries > 0) {
      const hitRateGood = stats.hitRate >= 0.6;
      console.log(`   Hit rate target: >= 60% ${hitRateGood ? '✓' : '✗'}`);
      console.log(`   Current: ${(stats.hitRate * 100).toFixed(1)}% ${hitRateGood ? '✓' : '→'}`);
    } else {
      console.log(`   No entries yet (run xkit archive to populate cache)`);
    }
    console.log('');
    console.log(ctx.colors.muted('TTL: 30 days (entries older than 30 days are automatically swept)'));
    console.log(ctx.colors.muted('Eviction: LRU (least recently used) when size cap reached'));
  }
}

/**
 * Clear cache
 */
function clearCache(ctx: CliContext): void {
  if (!cacheExists()) {
    console.log(`${ctx.p('warn')}Cache does not exist yet. Nothing to clear.`);
    return;
  }

  const cacheManager = new CacheManager();
  const beforeStats = cacheManager.getStats();
  const count = beforeStats.totalEntries;

  cacheManager.clear();

  console.log(`Cache cleared (deleted ${count} entries)`);
  console.log(`   Size before: ${beforeStats.sizeFormatted}`);
  console.log(`   Size after: 0 B`);
}
