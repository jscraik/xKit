/**
 * Standalone summarize command
 *
 * Summarizes a single URL without archiving.
 * Supports all summarization options: persona, length, template, variables.
 *
 * Phase 4.4: Optional CLI enhancement
 */

import type { Command } from 'commander';
import type { CliContext } from '../cli/shared.js';
import { ContentExtractor } from '../bookmark-enrichment/content-extractor.js';
import type { LinkedContent } from '../bookmark-enrichment/types.js';

interface SummarizeOptions {
  persona?: string;
  length?: string;
  template?: string;
  var?: string[];
  ollamaModel?: string;
}

/**
 * Register the summarize command
 */
export function registerSummarizeCommand(program: Command, ctx: CliContext): void {
  program
    .command('summarize [url]')
    .description('Summarize a single URL (without archiving)')
    .argument('[url]', 'URL to summarize')
    .option('--persona <name>', 'Summary persona (curious-learner, technical-researcher, product-manager, engineer-pragmatic, educator, skeptic, synthesizer)')
    .option('--length <level>', 'Summary length (short, medium, long, xl, xxl)')
    .option('--template <name>', 'Use custom template from ~/.xkit/templates/')
    .option('--var <key=value>', 'Template variable (can be used multiple times)', (value: string, previous: string[]) => {
      previous = previous || [];
      previous.push(value);
      return previous;
    })
    .option('--ollama-model <name>', 'Ollama model name (default: llama3.2)')
    .action(async (url: string | undefined, options: SummarizeOptions) => {
      try {
        await summarizeUrl(url, options, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Summarization failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Summarize a URL
 */
async function summarizeUrl(url: string | undefined, options: SummarizeOptions, ctx: CliContext): Promise<void> {
  // Validate URL
  if (!url) {
    console.error(`${ctx.p('err')}Missing required argument: <url>`);
    console.log(`\nUsage: xkit summarize <url> [options]`);
    console.log(`\nExamples:`);
    console.log(`  xkit summarize https://example.com/article`);
    console.log(`  xkit summarize https://example.com/article --persona technical-researcher --length long`);
    console.log(`  xkit summarize https://example.com/article --template research-paper`);
    process.exit(1);
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    console.error(`${ctx.p('err')}Invalid URL: ${url}`);
    process.exit(1);
  }

  console.log(`🔍 Summarizing: ${ctx.colors.command(url)}\n`);

  // Initialize content extractor with summarization enabled
  const extractor = new ContentExtractor({
    enableFullContent: true,
    enableSummarization: true,
    ollamaModel: options.ollamaModel,
    summaryPersona: options.persona,
    summaryLength: options.length,
    summaryTemplate: options.template,
    summaryTemplateVars: options.var ? ctx.parseVarFlags(options.var) : undefined,
  });

  // Extract content from URL
  console.log(`📥 Extracting content...`);
  const content = await extractor.extract(url);

  if (!content) {
    console.error(`${ctx.p('err')}Failed to extract content from URL`);
    process.exit(1);
  }

  // Check if summary was generated
  if (!content.summary) {
    console.error(`${ctx.p('err')}Failed to generate summary`);
    if (content.title) {
      console.log(`\nTitle: ${content.title}`);
    }
    process.exit(1);
  }

  // Display the summary
  console.log(`\n${ctx.colors.section('─'.repeat(50))}\n`);

  if (content.title) {
    console.log(`${ctx.colors.section(content.title)}\n`);
  }

  console.log(content.summary);

  // Display metadata
  console.log(`\n${ctx.colors.section('─'.repeat(50))}`);
  console.log(`\n${ctx.colors.muted('Metadata:')}`);

  if (content.author) {
    console.log(`  Author: ${content.author}`);
  }

  if (content.siteName) {
    console.log(`  Site: ${content.siteName}`);
  }

  if (content.type) {
    console.log(`  Type: ${content.type}`);
  }

  // Display template info if used
  if (options.template) {
    console.log(`  Template: ${options.template}`);
  }

  if (options.persona) {
    console.log(`  Persona: ${options.persona}`);
  }

  if (options.length) {
    console.log(`  Length: ${options.length}`);
  }

  console.log(`\n${ctx.colors.section('─'.repeat(50))}\n`);
}
