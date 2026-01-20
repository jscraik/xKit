/**
 * Learn command
 * Generate study materials from bookmarked content
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { MaterialGenerator, type MaterialType } from '../learning/index.js';
import { BookmarkEnricher, type EnrichedBookmark } from '../bookmark-enrichment/index.js';
import { TwitterClient } from '../lib/twitter-client.js';

interface LearnOptions {
  generate?: string;
  from?: string;
  count?: string;
  url?: string;
  output?: string;
}

/**
 * Register learn command
 */
export function registerLearnCommand(program: Command, ctx: CliContext): void {
  program
    .command('learn')
    .description('Generate study materials from bookmarked content')
    .option('--generate <types>', 'Material types to generate (comma-separated: study-guide,flashcards,quiz)')
    .option('--from <query>', 'Filter bookmarks by search query or tag')
    .option('--count <number>', 'Number of recent bookmarks to process', '10')
    .option('--url <url>', 'Generate materials from specific URL')
    .option('--output <dir>', 'Output directory (default: ~/xkit-learning/)')
    .action(async (options: LearnOptions) => {
      try {
        await handleLearn(options, ctx, program);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Learning material generation failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Handle learn command
 */
async function handleLearn(options: LearnOptions, ctx: CliContext, program: Command): Promise<void> {
  console.log('📚 xKit Learning Materials\n');

  // Parse options
  const count = parseInt(options.count ?? '10', 10);
  const outputDir = options.output ?? join(homedir(), 'xkit-learning');

  // Ensure output directory exists
  if (!mkdirSync(outputDir, { recursive: true })) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Parse material types
  const materialTypes: MaterialType[] = options.generate
    ? (options.generate.split(',').filter((t): t is MaterialType =>
        ['study-guide', 'flashcards', 'quiz'].includes(t)
      ))
    : ['study-guide'];

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
  const generator = new MaterialGenerator();

  // If URL provided, process directly
  if (options.url) {
    await generateFromUrl(options.url, materialTypes, generator, outputDir, ctx);
    return;
  }

  // Fetch bookmarks
  console.log('📚 Fetching bookmarks...');
  const result = await client.getBookmarks(count);

  if (!result.success || !result.tweets) {
    console.error(`${ctx.p('err')}Failed to fetch bookmarks: ${result.error ?? 'Unknown error'}`);
    process.exit(1);
  }

  const bookmarks = result.tweets as unknown as EnrichedBookmark[];
  console.log(`   Found ${bookmarks.length} bookmarks`);

  // Enrich bookmarks
  console.log('\n🔗 Enriching content...');
  const enricher = new BookmarkEnricher(
    {
      expandUrls: true,
      extractContent: true,
      enableFullContent: true,
      enableSummarization: false,
    },
    client
  );

  const enrichedBookmarks = await enricher.enrichBatch(bookmarks, {
    concurrency: 3,
    onProgress: (current, total) => {
      process.stdout.write(`\r  Progress: ${current}/${total}`);
    },
  });

  console.log('\n✅ Content enrichment complete');

  // Filter by tag/query if specified
  let filteredBookmarks = enrichedBookmarks;
  if (options.from) {
    const query = options.from.toLowerCase();
    filteredBookmarks = enrichedBookmarks.filter((b) => {
      const tags = (b.tags || []).map((t) => t.toLowerCase());
      const title = (b.text || '').toLowerCase();
      return tags.some((t) => t.includes(query)) || title.includes(query);
    });
    console.log(`   Filtered to ${filteredBookmarks.length} bookmarks matching "${options.from}"`);
  }

  // Generate materials
  console.log('\n📖 Generating learning materials...');

  for (const bookmark of filteredBookmarks) {
    if (!bookmark.linkedContent || bookmark.linkedContent.length === 0) {
      continue;
    }

    const content = bookmark.linkedContent[0];
    const metadata = {
      url: bookmark.url,
      title: content.title || bookmark.text || 'Untitled',
      siteName: content.siteName,
    };

    const textContent = content.textContent || content.summary || content.description || '';
    if (!textContent) {
      continue;
    }

    for (const type of materialTypes) {
      try {
        console.log(`   Generating ${type} for "${metadata.title}"...`);

        switch (type) {
          case 'study-guide':
            const studyGuide = await generator.generateStudyGuide(textContent, metadata);
            writeMaterial('study-guide', studyGuide.title, JSON.stringify(studyGuide, null, 2), outputDir);
            console.log(`      ✅ Study guide saved`);
            break;

          case 'flashcards':
            const flashcards = await generator.generateFlashcards(textContent, metadata);
            writeMaterial('flashcards', flashcards.title, JSON.stringify(flashcards, null, 2), outputDir);
            console.log(`      ✅ ${flashcards.cards.length} flashcards saved`);
            break;

          case 'quiz':
            const quiz = await generator.generateQuiz(textContent, metadata);
            writeMaterial('quiz', quiz.title, JSON.stringify(quiz, null, 2), outputDir);
            console.log(`      ✅ ${quiz.questions.length} quiz questions saved`);
            break;
        }
      } catch (error) {
        console.log(`      ❌ Failed: ${error}`);
      }
    }
  }

  console.log(`\n✅ Learning materials saved to: ${outputDir}`);
}

/**
 * Generate materials from specific URL
 */
async function generateFromUrl(
  url: string,
  materialTypes: MaterialType[],
  generator: MaterialGenerator,
  outputDir: string,
  ctx: CliContext
): Promise<void> {
  console.log(`📄 Processing URL: ${url}\n`);

  // For URL-based generation, we'd need to fetch and extract content
  // For now, show a placeholder message
  console.log(`${ctx.p('warn')}URL-based generation not yet implemented.`);
  console.log('Please use bookmark-based generation for now.');
}

/**
 * Write material to file
 */
function writeMaterial(type: string, title: string, content: string, outputDir: string): void {
  const safeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
  const filename = `${type}-${safeTitle}.json`;
  const filepath = join(outputDir, filename);
  writeFileSync(filepath, content, 'utf8');
}
