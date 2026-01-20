/**
 * Generate skills command
 * Extracts reusable patterns from bookmarked content and generates Claude Code skills
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { SkillExtractor, SkillWriter, type SkillExtractionOptions, type SkillCategory } from '../skill-generator/index.js';
import { BookmarkEnricher, type EnrichedBookmark } from '../bookmark-enrichment/index.js';
import { TwitterClient } from '../lib/twitter-client.js';

interface GenerateSkillsOptions {
  category?: string;
  minConfidence?: string;
  maxSkills?: string;
  count?: string;
  all?: boolean;
  folderId?: string;
  autoApprove?: boolean;
  review?: boolean;
}

/**
 * Register generate-skills command
 */
export function registerGenerateSkillsCommand(program: Command, ctx: CliContext): void {
  program
    .command('generate-skills')
    .description('Generate Claude Code skills from bookmarked content')
    .option('--category <name>', 'Filter by skill category (code-pattern, best-practice, workflow, tool-usage, architecture, testing, documentation)')
    .option('--min-confidence <level>', 'Minimum confidence threshold (0.0-1.0, default: 0.5)', '0.5')
    .option('--max-skills <number>', 'Maximum number of skills to generate (default: 10)', '10')
    .option('--count <number>', 'Number of recent bookmarks to analyze (default: 50)')
    .option('--all', 'Analyze all bookmarks instead of recent')
    .option('--folder-id <id>', 'Use bookmarks from a specific folder')
    .option('--auto-approve', 'Write skills directly to .claude/skills/ without review')
    .option('--review', 'Show skills pending review')
    .action(async (options: GenerateSkillsOptions) => {
      try {
        await handleGenerateSkills(options, ctx, program);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Skill generation failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Handle generate-skills command
 */
async function handleGenerateSkills(options: GenerateSkillsOptions, ctx: CliContext, program: Command): Promise<void> {
  // Handle review flag
  if (options.review) {
    showReviewStatus(ctx);
    return;
  }

  // Parse options
  const minConfidence = parseFloat(options.minConfidence ?? '0.5');
  const maxSkills = parseInt(options.maxSkills ?? '10', 10);
  const count = parseInt(options.count ?? '50', 10);

  if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    console.error(`${ctx.p('err')}Invalid confidence level. Must be between 0.0 and 1.0.`);
    process.exit(1);
  }

  if (isNaN(maxSkills) || maxSkills < 1) {
    console.error(`${ctx.p('err')}Invalid max-skills value. Must be a positive integer.`);
    process.exit(1);
  }

  console.log('🤖 xKit Skill Generator\n');

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

  // Fetch bookmarks
  console.log('📚 Fetching bookmarks...');

  let fetchResult;
  if (options.all) {
    fetchResult = await client.getAllBookmarks();
  } else if (options.folderId) {
    fetchResult = await client.getBookmarkFolderTimeline(options.folderId, count);
  } else {
    fetchResult = await client.getBookmarks(count);
  }

  if (!fetchResult.success || !fetchResult.tweets) {
    console.error(`${ctx.p('err')}Failed to fetch bookmarks: ${fetchResult.error ?? 'Unknown error'}`);
    process.exit(1);
  }

  const bookmarks = fetchResult.tweets as unknown as EnrichedBookmark[];
  console.log(`   Found ${bookmarks.length} bookmarks`);

  if (bookmarks.length === 0) {
    console.log(`\n${ctx.p('warn')}No bookmarks found. Nothing to process.`);
    return;
  }

  // Enrich bookmarks (with content extraction)
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
    concurrency: 5,
    onProgress: (current, total) => {
      process.stdout.write(`\r  Progress: ${current}/${total}`);
    },
  });

  console.log('\n✅ Content enrichment complete');

  // Extract skills
  console.log('\n🧠 Extracting skills...');

  const extractionOptions: SkillExtractionOptions = {
    category: options.category as SkillCategory,
    minConfidence,
    maxSkills,
  };

  const extractor = new SkillExtractor(extractionOptions);
  const skills = await extractor.extractFromBookmarks(enrichedBookmarks);

  console.log(`   Extracted ${skills.length} skill candidates`);

  if (skills.length === 0) {
    console.log(`\n${ctx.p('warn')}No skills extracted. Try adjusting --min-confidence or analyzing more bookmarks.`);
    return;
  }

  // Display summary
  console.log('\n📊 Skills Summary:');
  console.log('');

  // Group by category
  const byCategory = new Map<string, typeof skills>();
  for (const skill of skills) {
    const category = skill.category;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(skill);
  }

  for (const [category, categorySkills] of byCategory.entries()) {
    console.log(`${category}:`);
    for (const skill of categorySkills.slice(0, 5)) {
      const confidence = (skill.confidence * 100).toFixed(0);
      console.log(`  - ${skill.name} (${confidence}% confidence)`);
    }
    if (categorySkills.length > 5) {
      console.log(`  ... and ${categorySkills.length - 5} more`);
    }
    console.log('');
  }

  // Write skills
  console.log('✍️  Writing skills...');

  const writer = new SkillWriter({
    autoApprove: options.autoApprove ?? false,
  });

  const result = writer.writeSkills(skills);

  if (result.written.length > 0) {
    console.log(`   ✅ ${result.written.length} skills written to .claude/skills/`);
    for (const path of result.written) {
      console.log(`      - ${path}`);
    }
  }

  if (result.review.length > 0) {
    console.log(`   ⏳ ${result.review.length} skills pending review in .claude/skills-review/`);
    console.log('');
    console.log('   Review these skills and approve them:');
    console.log(`     xkit skills approve <skill-name>`);
    console.log(`     xkit skills reject <skill-name>`);
    console.log(`     xkit skills list --review`);
  }

  if (result.errors.length > 0) {
    console.log(`   ❌ ${result.errors.length} skills failed to write:`);
    for (const error of result.errors) {
      console.log(`      - ${error.skill}: ${error.error}`);
    }
  }

  console.log('');
  console.log('Next steps:');
  if (result.review.length > 0) {
    console.log('   1. Review skills in ~/.claude/skills-review/');
    console.log('   2. Approve quality skills: xkit skills approve <name>');
    console.log('   3. Reject low-quality skills: xkit skills reject <name>');
    console.log('   4. Approved skills move to ~/.claude/skills/');
  } else {
    console.log('   Skills are available in Claude Code!');
  }
}

/**
 * Show review status
 */
function showReviewStatus(ctx: CliContext): void {
  const skillsDir = join(homedir(), '.claude', 'skills');
  const reviewDir = join(homedir(), '.claude', 'skills-review');

  console.log('📋 Skills Review Status\n');

  // List skills in review directory
  if (existsSync(reviewDir)) {
    const files = readdirSync(reviewDir).filter((f) => f.endsWith('.skill.md'));
    if (files.length > 0) {
      console.log(`Pending Review (${files.length}):`);
      for (const file of files) {
        const name = file.replace('.skill.md', '');
        console.log(`  - ${name}`);
      }
      console.log('');
    }
  }

  // List installed skills
  if (existsSync(skillsDir)) {
    const files = readdirSync(skillsDir).filter((f) => f.endsWith('.skill.md'));
    if (files.length > 0) {
      console.log(`Installed Skills (${files.length}):`);
      for (const file of files) {
        const name = file.replace('.skill.md', '');
        console.log(`  - ${name}`);
      }
    } else {
      console.log('No skills installed yet.');
    }
  } else {
    console.log('No skills installed yet.');
  }
}
