/**
 * Unified bookmarks archive command
 * Fetches, enriches, categorizes, and exports bookmarks to markdown
 */

import type { Command } from 'commander';
import { BookmarkCategorizer } from '../bookmark-categorization/index.js';
import { BookmarkEnricher, tweetDataBatchToBookmarkRecords } from '../bookmark-enrichment/index.js';
import { FolderManager } from '../bookmark-folders/index.js';
import { MarkdownWriter } from '../bookmark-markdown/index.js';
import { MediaHandler } from '../bookmark-media/index.js';
import { StateManager } from '../bookmark-state/index.js';
import { StatsTracker } from '../bookmark-stats/index.js';
import type { CliContext } from '../cli/shared.js';
import { TwitterClient } from '../lib/twitter-client.js';
import { WebhookNotifier } from '../webhook-notifications/index.js';
import { TokenTracker } from '../bookmark-analysis/token-tracker.js';
import { WorkerPool } from '../bookmark-analysis/worker-pool.js';
import type { ParallelConfig } from '../bookmark-analysis/work-item.js';
import { ErrorLogger, deduplicateByKey } from './shared/index.js';

interface ArchiveOptions {
  count?: string;
  all?: boolean;
  maxPages?: string;
  folderId?: string;
  force?: boolean;
  skipEnrichment?: boolean;
  skipCategorization?: boolean;
  includeMedia?: boolean;
  outputDir?: string;
  archiveFile?: string;
  timezone?: string;
  organizeByMonth?: boolean;
  webhookUrl?: string;
  webhookType?: 'discord' | 'slack' | 'generic';
  stats?: boolean;
  summarize?: boolean;
  ollamaModel?: string;
  noFullContent?: boolean;
  fetchThreads?: boolean;
  parallel?: boolean;
  parallelWorkers?: string;
  parallelThreshold?: string;
  persona?: string;
  length?: string;
  // Custom template support (Phase 4)
  template?: string;
  var?: string[];
  // Filter options
  minLikes?: string;
  excludeRetweets?: boolean;
  dateFrom?: string;
  dateTo?: string;
  excludeReplies?: boolean;
}

/**
 * Archive bookmarks to markdown with full enrichment pipeline
 */
async function archiveBookmarks(options: ArchiveOptions, program: Command, ctx: CliContext): Promise<void> {
  const opts = program.opts();
  const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
  const startTime = Date.now();

  console.log('🐉 xKit Bookmark Archiver\n');

  // Initialize stats tracker
  const stats = new StatsTracker();
  stats.start();

  // Initialize token tracker
  const tokenTracker = new TokenTracker();

  // Initialize webhook notifier if configured
  let webhook: WebhookNotifier | undefined;
  if (options.webhookUrl) {
    webhook = new WebhookNotifier({
      url: options.webhookUrl,
      type: options.webhookType || 'generic',
      enabled: true,
      notifyOn: {
        start: true,
        success: true,
        error: true,
        rateLimit: true,
      },
    });
    await webhook.notifyStart();
  }

  try {
    // Step 1: Resolve credentials
    console.log('📱 Authenticating...');
    const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

    for (const warning of warnings) {
      console.error(`${ctx.p('warn')}${warning}`);
    }

    if (!cookies.authToken || !cookies.ct0) {
      console.error(`${ctx.p('err')}Missing required credentials. Run 'xkit setup' first.`);
      process.exit(1);
    }

    // Step 2: Initialize components
    const client = new TwitterClient({ cookies, timeoutMs });
    const stateManager = new StateManager();
    const enricher = new BookmarkEnricher(
      {
        expandUrls: !options.skipEnrichment,
        extractContent: !options.skipEnrichment,
        enableFullContent: !options.noFullContent,
        enableSummarization: options.summarize || false,
        ollamaModel: options.ollamaModel,
        fetchThreads: options.fetchThreads || false,
        summaryPersona: options.persona,
        summaryLength: options.length,
        // Custom template support (Phase 4)
        summaryTemplate: options.template,
        summaryTemplateVars: options.var ? ctx.parseVarFlags(options.var) : undefined,
      },
      client,
    );
    const categorizer = new BookmarkCategorizer();
    const writer = new MarkdownWriter({
      outputDir: options.outputDir || './knowledge',
      archiveFile: options.archiveFile || './bookmarks.md',
      timezone: options.timezone || 'America/New_York',
      // organizeByMonth defaults to true in MarkdownWriter
      // Pass options.organizeByMonth explicitly only if provided
      ...(options.organizeByMonth !== undefined && { organizeByMonth: options.organizeByMonth }),
    });
    const mediaHandler = new MediaHandler({
      includeMedia: options.includeMedia || false,
    });
    const folderManager = new FolderManager();

    // Initialize error logger
    const outputDir = options.outputDir || './knowledge';
    const errorLogger = new ErrorLogger(outputDir);

    // Step 3: Fetch bookmarks
    console.log('📥 Fetching bookmarks...');

    let count = 20;
    const usePagination = options.all;

    if (!usePagination && options.count) {
      const countResult = ctx.parseIntegerOption(options.count, { name: '--count', min: 1 });
      if (!countResult.ok) {
        console.error(`${ctx.p('err')}${countResult.error}`);
        process.exit(2);
      }
      count = countResult.value;
    }

    let maxPages: number | undefined;
    if (options.maxPages) {
      const maxPagesResult = ctx.parseIntegerOption(options.maxPages, { name: '--max-pages', min: 1 });
      if (!maxPagesResult.ok) {
        console.error(`${ctx.p('err')}${maxPagesResult.error}`);
        process.exit(2);
      }
      maxPages = maxPagesResult.value;
    }

    const result = usePagination ? await client.getAllBookmarks({ maxPages }) : await client.getBookmarks(count);

    if (!result.success || !result.tweets) {
      const error = `Failed to fetch bookmarks: ${result.error}`;
      console.error(`${ctx.p('err')}${error}`);
      if (webhook) {
        await webhook.notifyError(error);
      }
      process.exit(1);
    }

    console.log(`✅ Fetched ${result.tweets.length} bookmarks`);

    // Step 4: Convert TweetData to BookmarkRecord format
    let bookmarksToProcess = tweetDataBatchToBookmarkRecords(result.tweets);

    // Step 4.1: Apply filter options if specified
    const beforeFilters = bookmarksToProcess.length;

    if (options.minLikes) {
      const minLikesResult = ctx.parseIntegerOption(options.minLikes, { name: '--min-likes', min: 0 });
      if (minLikesResult.ok) {
        const minLikes = minLikesResult.value;
        bookmarksToProcess = bookmarksToProcess.filter((b: any) => (b.likeCount || 0) >= minLikes);
        console.log(`🔍 Filtered by min likes (${minLikes}): ${beforeFilters - bookmarksToProcess.length} removed`);
      }
    }

    if (options.excludeRetweets) {
      const beforeRetweets = bookmarksToProcess.length;
      bookmarksToProcess = bookmarksToProcess.filter((b: any) => !b.isRetweet);
      if (beforeRetweets - bookmarksToProcess.length > 0) {
        console.log(`🔍 Excluded ${beforeRetweets - bookmarksToProcess.length} retweets`);
      }
    }

    if (options.excludeReplies) {
      const beforeReplies = bookmarksToProcess.length;
      bookmarksToProcess = bookmarksToProcess.filter((b: any) => !b.isReply);
      if (beforeReplies - bookmarksToProcess.length > 0) {
        console.log(`🔍 Excluded ${beforeReplies - bookmarksToProcess.length} replies`);
      }
    }

    if (options.dateFrom) {
      const fromDate = new Date(options.dateFrom);
      if (!isNaN(fromDate.getTime())) {
        const beforeDate = bookmarksToProcess.length;
        bookmarksToProcess = bookmarksToProcess.filter((b: any) => {
          const tweetDate = new Date(b.createdAt || b.date);
          return tweetDate >= fromDate;
        });
        console.log(`🔍 Filtered by date from (${options.dateFrom}): ${beforeDate - bookmarksToProcess.length} removed`);
      } else {
        console.warn(`${ctx.p('warn')}Invalid date-from format, skipping date filter. Use YYYY-MM-DD`);
      }
    }

    if (options.dateTo) {
      const toDate = new Date(options.dateTo);
      if (!isNaN(toDate.getTime())) {
        const beforeDate = bookmarksToProcess.length;
        bookmarksToProcess = bookmarksToProcess.filter((b: any) => {
          const tweetDate = new Date(b.createdAt || b.date);
          return tweetDate <= toDate;
        });
        console.log(`🔍 Filtered by date to (${options.dateTo}): ${beforeDate - bookmarksToProcess.length} removed`);
      } else {
        console.warn(`${ctx.p('warn')}Invalid date-to format, skipping date filter. Use YYYY-MM-DD`);
      }
    }

    // Step 4.2: Deduplicate by ID
    const uniqueBookmarks = deduplicateByKey(bookmarksToProcess, (b: any) => b.id);
    if (uniqueBookmarks.length < bookmarksToProcess.length) {
      console.log(`🔍 Deduplicated ${bookmarksToProcess.length - uniqueBookmarks.length} duplicate bookmarks`);
      bookmarksToProcess = uniqueBookmarks;
    }

    // Step 4.3: Add folder tags if folder ID specified
    if (options.folderId) {
      bookmarksToProcess = folderManager.addFolderTags(bookmarksToProcess, options.folderId);
    }

    // Step 4.6: Add media if enabled
    if (options.includeMedia) {
      bookmarksToProcess = bookmarksToProcess.map((bookmark, index) => ({
        ...bookmark,
        media: mediaHandler.extractMedia(result.tweets![index].media),
      })) as any;
    }

    // Step 5: Filter out already processed (unless force)
    if (!options.force) {
      const beforeFilter = bookmarksToProcess.length;
      bookmarksToProcess = stateManager.filterNew(bookmarksToProcess);
      const filtered = beforeFilter - bookmarksToProcess.length;

      if (filtered > 0) {
        console.log(`⏭️  Skipped ${filtered} already processed bookmarks`);
        stats.recordSkipped(filtered);
      }

      if (bookmarksToProcess.length === 0) {
        console.log('\n✨ No new bookmarks to process!');
        return;
      }
    }

    console.log(`📝 Processing ${bookmarksToProcess.length} bookmarks...\n`);
    stats.recordProcessed(bookmarksToProcess.length);

    // Step 5.5: Parallel processing setup (if enabled)
    if (options.parallel) {
      const parallelConfig: ParallelConfig = {
        enabled: true,
        concurrency: options.parallelWorkers ? parseInt(options.parallelWorkers, 10) : 4,
        threshold: options.parallelThreshold ? parseInt(options.parallelThreshold, 10) : 50,
        batchSize: 10,
      };

      if (bookmarksToProcess.length >= parallelConfig.threshold) {
        console.log(`⚡ Parallel processing enabled with ${parallelConfig.concurrency} workers`);
        // Note: Full integration with enricher/categorizer will be added in Phase 2.5
        // For now, this is a placeholder for the parallel processing architecture
      } else {
        console.log(`ℹ️  Parallel mode enabled but ${bookmarksToProcess.length} bookmarks (threshold: ${parallelConfig.threshold})`);
        console.log(`   Processing sequentially. Use --parallel-threshold ${bookmarksToProcess.length} to force parallel.`);
      }
    }

    // Step 6: Enrich bookmarks
    if (!options.skipEnrichment) {
      console.log('🔗 Enriching content...');
      if (options.summarize) {
        console.log('🤖 AI summarization enabled (using Ollama)');
      }
      if (options.fetchThreads) {
        console.log('🧵 Thread fetching enabled');
      }
      const enrichStart = Date.now();

      try {
        const enrichedBookmarks = await enricher.enrichBatch(bookmarksToProcess, {
          concurrency: 5,
          onProgress: (current, total) => {
            if (options.stats) {
              const progressBar = stats.generateProgressBar(current, total);
              process.stdout.write(`\r  ${progressBar}`);
            } else {
              process.stdout.write(`\r  Progress: ${current}/${total}`);
            }
          },
        });

        const enrichTime = Date.now() - enrichStart;
        stats.recordEnrichmentTime(enrichTime);
        console.log('\n✅ Content enrichment complete');
        bookmarksToProcess = enrichedBookmarks;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errorLogger.log('enrichment', errorMessage);
        console.error(`${ctx.p('warn')}Some enrichment failed, continuing with partial results`);
      }
    }

    // Step 7: Categorize bookmarks
    let categorizedBookmarks;

    if (options.skipCategorization) {
      // If skipping categorization, add default category
      categorizedBookmarks = bookmarksToProcess.map((b) => ({
        ...b,
        category: 'tweet',
        categoryAction: 'capture' as const,
        categoryFolder: '',
      }));
    } else {
      console.log('🏷️  Categorizing bookmarks...');
      const catStart = Date.now();

      categorizedBookmarks = categorizer.categorizeBatch(bookmarksToProcess);

      const catTime = Date.now() - catStart;
      stats.recordCategorizationTime(catTime);

      const categoryStats = categorizer.getCategoryStats(categorizedBookmarks);
      console.log('✅ Categorization complete:');
      for (const [category, count] of Object.entries(categoryStats)) {
        console.log(`   ${category}: ${count}`);
      }
    }

    // Step 8: Write to markdown
    console.log('\n📄 Writing markdown files...');
    const writeStart = Date.now();

    const writeResult = await writer.write(categorizedBookmarks);

    const writeTime = Date.now() - writeStart;
    stats.recordWritingTime(writeTime);

    console.log(`✅ Archive updated: ${writeResult.archiveFile}`);

    if (writeResult.knowledgeFiles.length > 0) {
      console.log(`✅ Created ${writeResult.knowledgeFiles.length} knowledge files`);
    }

    // Step 9: Update state
    const bookmarkIds = categorizedBookmarks.map((b) => b.id);
    stateManager.markBatchProcessed(bookmarkIds);
    stateManager.save();

    // Step 10: Display summary
    stats.end();
    const archiveStats = writer.getArchiveStats();

    console.log('\n📊 Summary:');
    console.log(`   Total processed: ${bookmarksToProcess.length}`);
    console.log(`   Archive entries: ${bookmarksToProcess.length}`);
    console.log(`   Knowledge files: ${writeResult.knowledgeFiles.length}`);
    console.log(`   Total in archive: ${archiveStats.totalEntries}`);
    console.log(`   Duration: ${Math.round((Date.now() - startTime) / 1000)}s`);

    // Calculate enhanced statistics
    const totalLikes = bookmarksToProcess.reduce((sum: number, b: any) => sum + (b.likeCount || 0), 0);
    const averageLikes = bookmarksToProcess.length > 0 ? Math.round(totalLikes / bookmarksToProcess.length) : 0;
    const retweetCount = bookmarksToProcess.filter((b: any) => b.isRetweet).length;
    const replyCount = bookmarksToProcess.filter((b: any) => b.isReply).length;

    console.log('\n📈 Enhanced Statistics:');
    console.log(`   Total likes: ${totalLikes}`);
    console.log(`   Average likes per bookmark: ${averageLikes}`);
    console.log(`   Retweets: ${retweetCount} (${Math.round((retweetCount / bookmarksToProcess.length) * 100)}%)`);
    console.log(`   Replies: ${replyCount} (${Math.round((replyCount / bookmarksToProcess.length) * 100)}%)`);

    // Calculate top domains if URL expansion happened
    const domains = new Map<string, number>();
    for (const bookmark of bookmarksToProcess) {
      if ((bookmark as any).expandedUrl) {
        try {
          const url = new URL((bookmark as any).expandedUrl);
          const domain = url.hostname.replace('www.', '');
          domains.set(domain, (domains.get(domain) || 0) + 1);
        } catch {
          // Invalid URL, skip
        }
      }
    }

    if (domains.size > 0) {
      const topDomains = Array.from(domains.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      console.log('\n   Top domains:');
      for (const [domain, count] of topDomains) {
        console.log(`     ${domain}: ${count}`);
      }
    }

    // Display detailed stats if requested
    if (options.stats) {
      console.log('\n' + stats.formatStats());
    }

    // Send success webhook
    if (webhook) {
      await webhook.notifySuccess({
        bookmarksProcessed: bookmarksToProcess.length,
        knowledgeFilesCreated: writeResult.knowledgeFiles.length,
        totalInArchive: archiveStats.totalEntries,
        duration: Date.now() - startTime,
      });
    }

    // Display token usage report if any LLM operations were performed
    const tokenReport = tokenTracker.getReport();
    if (tokenReport.total.input > 0 || tokenReport.total.output > 0) {
      console.log('\n' + tokenTracker.formatReport());
    }

    // Save error log if there were any errors
    if (errorLogger.getCount() > 0) {
      errorLogger.save();
      console.log(`\n⚠️  Logged ${errorLogger.getCount()} errors to ${outputDir}/errors.log`);
      const summary = errorLogger.getSummary();
      if (Object.keys(summary).length > 0) {
        console.log('   Error summary:');
        for (const [operation, count] of Object.entries(summary)) {
          console.log(`     ${operation}: ${count}`);
        }
      }
    }

    console.log('\n✨ Done!\n');
  } catch (error) {
    stats.recordError();
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (webhook) {
      await webhook.notifyError(errorMessage);
    }

    throw error;
  }
}

/**
 * Register the bookmarks archive command
 */
export function registerBookmarksArchiveCommand(program: Command, ctx: CliContext): void {
  program
    .command('bookmarks-archive')
    .alias('archive')
    .alias('ba')
    .description('Archive bookmarks to markdown with enrichment and categorization')
    .option('-n, --count <number>', 'Number of bookmarks to fetch', '20')
    .option('--all', 'Fetch all bookmarks (paged)')
    .option('--max-pages <number>', 'Stop after N pages when using --all')
    .option('--folder-id <id>', 'Bookmark folder (collection) id')
    .option('--force', 'Re-process already archived bookmarks')
    .option('--skip-enrichment', 'Skip URL expansion and content extraction')
    .option('--skip-categorization', 'Skip automatic categorization')
    .option('--include-media', 'Include media attachments (photos, videos, GIFs)')
    .option('--output-dir <path>', 'Knowledge base directory', './knowledge')
    .option('--archive-file <path>', 'Archive markdown file', './bookmarks.md')
    .option('--timezone <tz>', 'Timezone for date formatting', 'America/New_York')
    .option('--organize-by-month', 'Organize knowledge files by month_year (e.g., jan_2026/)')
    .option('--webhook-url <url>', 'Webhook URL for notifications (Discord, Slack, etc.)')
    .option('--webhook-type <type>', 'Webhook type: discord, slack, or generic', 'generic')
    .option('--stats', 'Show detailed processing statistics')
    .option('--summarize', 'Generate AI summaries using local Ollama')
    .option('--ollama-model <name>', 'Ollama model to use (default: qwen2.5:7b)')
    .option('--no-full-content', 'Disable full article content extraction')
    .option('--fetch-threads', 'Fetch full Twitter threads for bookmarked tweets')
    .option('--persona <name>', 'Summary persona: curious-learner, technical-researcher, product-manager, engineer-pragmatic, educator, skeptic, synthesizer (default: curious-learner)')
    .option('--length <level>', 'Summary length: short, medium, long, xl, xxl (default: medium)')
    .option('--parallel', 'Enable parallel processing (default: off)')
    .option('--parallel-workers <number>', 'Number of worker threads (default: 4)', '4')
    .option('--parallel-threshold <number>', 'Minimum bookmarks to enable parallel (default: 50)', '50')
    // Custom template support (Phase 4)
    .option('--template <name>', 'Use custom template from ~/.xkit/templates/')
    .option('--var <key=value>', 'Template variable (can be used multiple times)', (value: string, previous: string[] = []) => {
      previous.push(value);
      return previous;
    }, [])
    // Filter options
    .option('--min-likes <number>', 'Only archive bookmarks with at least this many likes')
    .option('--exclude-retweets', 'Exclude retweeted bookmarks')
    .option('--exclude-replies', 'Exclude reply tweets')
    .option('--date-from <date>', 'Only archive bookmarks from this date onwards (YYYY-MM-DD)')
    .option('--date-to <date>', 'Only archive bookmarks up to this date (YYYY-MM-DD)')
    .action(async (options: ArchiveOptions) => {
      try {
        await archiveBookmarks(options, program, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Archive failed:`, error);
        process.exit(1);
      }
    });
}
