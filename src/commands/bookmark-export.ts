/**
 * Bookmark export command
 * Exports X bookmarks to JSON file with resumability support
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import { BookmarkExporter } from '../bookmark-export/bookmark-exporter.js';
import { ExportState } from '../bookmark-export/export-state.js';
import { logger } from '../bookmark-export/logger.js';
import { ProgressReporter } from '../bookmark-export/progress-reporter.js';
import { RateLimiter } from '../bookmark-export/rate-limiter.js';
import type { BookmarkRecord, Credentials } from '../bookmark-export/types.js';
import { XAPIClient } from '../bookmark-export/xapi-client.js';
import type { CliContext } from '../cli/shared.js';

/**
 * Configuration structure for bookmark export
 */
interface ExportConfig {
  xApi: {
    apiKey: string;
    apiSecret: string;
    accessToken?: string;
    accessSecret?: string;
  };
  output: {
    directory: string;
    filenamePattern: string;
  };
  rateLimit: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

/**
 * Load configuration from .bookmark-export.config.json
 */
function loadConfig(configPath: string): ExportConfig {
  const defaultConfig: ExportConfig = {
    xApi: {
      apiKey: process.env.X_API_KEY || '',
      apiSecret: process.env.X_API_SECRET || '',
      accessToken: process.env.X_ACCESS_TOKEN,
      accessSecret: process.env.X_ACCESS_SECRET,
    },
    output: {
      directory: './exports',
      filenamePattern: 'bookmarks_export_{timestamp}.json',
    },
    rateLimit: {
      maxRetries: 3,
      backoffMultiplier: 2,
    },
  };

  if (!existsSync(configPath)) {
    logger.info('No config file found, using defaults and environment variables', {
      configPath,
    });
    return defaultConfig;
  }

  try {
    const configContent = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent) as Partial<ExportConfig>;

    // Merge with defaults
    return {
      xApi: {
        ...defaultConfig.xApi,
        ...config.xApi,
      },
      output: {
        ...defaultConfig.output,
        ...config.output,
      },
      rateLimit: {
        ...defaultConfig.rateLimit,
        ...config.rateLimit,
      },
    };
  } catch (error) {
    logger.error('Failed to load config file, using defaults', {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return defaultConfig;
  }
}

/**
 * Validate configuration
 */
function validateConfig(config: ExportConfig): void {
  if (!config.xApi.apiKey || !config.xApi.apiSecret) {
    throw new Error(
      'X API credentials are required. Set X_API_KEY and X_API_SECRET environment variables or provide them in .bookmark-export.config.json',
    );
  }
}

/**
 * Export bookmarks command handler
 */
async function exportBookmarks(options: { resume?: boolean; outputDir?: string; config?: string }): Promise<void> {
  const configPath = options.config || '.bookmark-export.config.json';

  try {
    // Load configuration
    const config = loadConfig(configPath);
    validateConfig(config);

    // Override output directory if provided via CLI
    if (options.outputDir) {
      config.output.directory = options.outputDir;
    }

    // Ensure output directory exists
    const outputDir = resolve(config.output.directory);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      logger.info('Created output directory', { outputDir });
    }

    // Initialize components
    const xapiClient = new XAPIClient();
    const rateLimiter = new RateLimiter(config.rateLimit.maxRetries, config.rateLimit.backoffMultiplier);
    const exportState = new ExportState();
    const bookmarkExporter = new BookmarkExporter({
      outputDirectory: config.output.directory,
      filenamePattern: config.output.filenamePattern,
    });

    // Check for resume
    let startCursor: string | null = null;
    let processedCount = 0;

    if (options.resume && exportState.exists()) {
      const loaded = exportState.load();
      if (loaded) {
        startCursor = exportState.getLastCursor();
        processedCount = exportState.getProcessedCount();
        logger.info('Resuming export from previous state', {
          startCursor,
          processedCount,
        });
        console.log(`Resuming export from ${processedCount} bookmarks...`);
      }
    } else {
      exportState.initialize();
    }

    // Authenticate with X API
    console.log('Authenticating with X API...');
    const credentials: Credentials = {
      apiKey: config.xApi.apiKey,
      apiSecret: config.xApi.apiSecret,
      accessToken: config.xApi.accessToken,
      accessSecret: config.xApi.accessSecret,
    };

    const authToken = await xapiClient.authenticate(credentials);
    console.log(`Authenticated as @${authToken.username}`);

    // Fetch all bookmarks with pagination
    const allBookmarks: BookmarkRecord[] = [];
    let cursor: string | null = startCursor;
    let hasMore = true;

    // We don't know the total count upfront, so we'll create a progress reporter
    // that we update as we go
    let progressReporter: ProgressReporter | null = null;

    console.log('Fetching bookmarks...');

    while (hasMore) {
      // Check rate limit before making request
      await rateLimiter.waitIfNeeded('bookmarks');

      // Fetch page of bookmarks
      const page = await xapiClient.getBookmarks(authToken, cursor || undefined);

      // Update rate limiter with new rate limit info
      rateLimiter.updateLimit('bookmarks', page.rateLimit);

      // Add bookmarks to collection
      allBookmarks.push(...page.bookmarks);
      processedCount += page.bookmarks.length;

      // Update progress reporter
      if (progressReporter) {
        progressReporter.setProcessed(processedCount);
        progressReporter.forceUpdate();
      } else if (processedCount > 10) {
        // Create progress reporter once we have some bookmarks
        // We'll set a high total that we'll adjust later
        progressReporter = new ProgressReporter({
          total: processedCount * 2, // Rough estimate
          displayProgress: true,
        });
        progressReporter.setProcessed(processedCount);
      }

      // Update export state
      cursor = page.nextCursor;
      exportState.update(cursor, processedCount);
      exportState.save();

      // Check if there are more pages
      hasMore = cursor !== null;

      logger.info('Fetched bookmark page', {
        pageSize: page.bookmarks.length,
        totalProcessed: processedCount,
        hasMore,
      });
    }

    console.log(`\nFetched ${allBookmarks.length} bookmarks total`);

    // Export to JSON file
    console.log('Writing bookmarks to file...');
    const filePath = await bookmarkExporter.export(allBookmarks, {
      exportTimestamp: new Date().toISOString(),
      exporterVersion: '1.0.0',
      userId: authToken.userId,
      username: authToken.username,
    });

    // Display completion summary
    if (progressReporter) {
      progressReporter.displayCompletionSummary(filePath);
    } else {
      console.log(`\nExport complete!`);
      console.log(`Total bookmarks: ${allBookmarks.length}`);
      console.log(`Output file: ${filePath}`);
    }

    // Clean up state file on successful completion
    exportState.delete();

    logger.info('Export completed successfully', {
      totalBookmarks: allBookmarks.length,
      filePath,
    });
  } catch (error) {
    logger.error('Export failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Register the bookmark export command with Commander
 */
export function registerBookmarkExportCommand(program: Command, ctx: CliContext): void {
  program
    .command('export-bookmarks')
    .description('Export X bookmarks to JSON file')
    .option('--resume', 'Resume from previous interrupted export')
    .option('--output-dir <directory>', 'Output directory for exported bookmarks')
    .option('--config <path>', 'Path to configuration file (default: .bookmark-export.config.json)')
    .action(async (options) => {
      await exportBookmarks(options);
    });
}
