/**
 * Recap command
 * Generate periodic recaps from bookmark collections with thematic clustering
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { RecapSystem, type RecapPeriod } from '../learning/index.js';
import { BookmarkEnricher, type EnrichedBookmark } from '../bookmark-enrichment/index.js';
import { TwitterClient } from '../lib/twitter-client.js';

interface RecapOptions {
  period?: string;
  categories?: string;
  count?: string;
  output?: string;
}

/**
 * Register recap command
 */
export function registerRecapCommand(program: Command, ctx: CliContext): void {
  program
    .command('recap')
    .description('Generate periodic recaps from bookmark collections')
    .option('--period <daily|weekly|monthly>', 'Recap period (default: weekly)', 'weekly')
    .option('--categories <tags>', 'Filter by categories/tags (comma-separated)')
    .option('--count <number>', 'Number of recent bookmarks to include', '50')
    .option('--output <file>', 'Output file (default: ~/xkit-learning/recap-{period}.json)')
    .action(async (options: RecapOptions) => {
      try {
        await handleRecap(options, ctx, program);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Recap generation failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Handle recap command
 */
async function handleRecap(options: RecapOptions, ctx: CliContext, program: Command): Promise<void> {
  console.log('📋 xKit Recap Generator\n');

  // Parse options
  const period = (options.period ?? 'weekly') as RecapPeriod;
  const count = parseInt(options.count ?? '50', 10);
  const categories = options.categories ? options.categories.split(',') : undefined;
  const defaultOutput = join(homedir(), 'xkit-learning', `recap-${period}.json`);
  const outputFile = options.output ?? defaultOutput;

  // Initialize components
  const opts = program.opts();
  const timeoutMs = ctx.resolveTimeoutFromOptions(opts);

  console.log('📱 Authenticating...');
  const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

  for (const warning of warnings) {
    console.error(`${ctx.p('warn')}${warning}`);
  }

  if (!cookies.authToken || !cookies.ct0) {
    console.error(`${ctx.p('err')}Missing required credentials. Run 'xkit setup' first.`);
    process.exit(1);
  }

  const client = new TwitterClient({ cookies, timeoutMs });
  const recapSystem = new RecapSystem();

  // Fetch bookmarks
  console.log('📚 Fetching bookmarks...');
  const result = await client.getAllBookmarks();

  if (!result.success || !result.tweets) {
    console.error(`${ctx.p('err')}Failed to fetch bookmarks: ${result.error ?? 'Unknown error'}`);
    process.exit(1);
  }

  let bookmarks = result.tweets as unknown as EnrichedBookmark[];

  // Limit to requested count
  bookmarks = bookmarks.slice(0, count);
  console.log(`   Found ${bookmarks.length} bookmarks`);

  // Enrich bookmarks
  console.log('\n🔗 Enriching content...');
  const enricher = new BookmarkEnricher(
    {
      expandUrls: true,
      extractContent: true,
      enableFullContent: true,
      enableSummarization: true,
    },
    client
  );

  const enrichedBookmarks = await enricher.enrichBatch(bookmarks, {
    concurrency: 5,
    onProgress: (current, total) => {
      process.stdout.write(`\r  Progress: ${current}/${total}`);
    },
  });

  console.log('\n✅ Content enrichment complete');

  // Generate recap
  console.log(`\n🧠 Generating ${period} recap...`);

  const recap = await recapSystem.generateRecap(enrichedBookmarks, {
    period,
    categories,
  });

  // Write recap
  writeFileSync(outputFile, JSON.stringify(recap, null, 2), 'utf8');

  // Display recap summary
  console.log(`\n✅ Recap saved to: ${outputFile}\n`);

  console.log('📊 Recap Summary:');
  console.log(`   Bookmarks processed: ${recap.bookmarks.processed}/${recap.bookmarks.total}`);
  console.log(`   Themes identified: ${recap.themes.length}`);
  console.log(`   Connections found: ${recap.connections.length}`);
  console.log('');

  // Display themes
  console.log('🎯 Thematic Clusters:');
  for (const theme of recap.themes) {
    console.log(`\n   ${theme.theme}:`);
    console.log(`   ${theme.description}`);
    console.log(`   Bookmarks: ${theme.bookmarks.length}`);
    if (theme.keyInsights.length > 0) {
      console.log(`   Key insights:`);
      for (const insight of theme.keyInsights.slice(0, 2)) {
        console.log(`      - ${insight}`);
      }
    }
  }

  // Display connections
  if (recap.connections.length > 0) {
    console.log('\n🔗 Topic Connections:');
    for (const connection of recap.connections.slice(0, 3)) {
      console.log(`   ${connection.from} → ${connection.to}`);
      console.log(`   ${connection.connection}`);
      console.log(`   Strength: ${(connection.strength * 100).toFixed(0)}%`);
      console.log('');
    }
  }

  // Display next steps
  if (recap.nextSteps.length > 0) {
    console.log('🚀 Next Steps:');
    for (const step of recap.nextSteps) {
      console.log(`   - ${step}`);
    }
    console.log('');
  }

  // Display reflection questions
  if (recap.reflectionQuestions.length > 0) {
    console.log('🤔 Reflection Questions:');
    for (const question of recap.reflectionQuestions) {
      console.log(`   - ${question}`);
    }
    console.log('');
  }
}
