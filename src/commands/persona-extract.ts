/**
 * Persona extract command
 *
 * Analyzes Twitter content to extract persona information including:
 * - Communication style and tone
 * - Technical knowledge level
 * - Core values and beliefs
 * - Areas of expertise
 * - Visual style from images
 * - Speech patterns from videos
 *
 * Phase 5: CLI integration - Task #16
 */

import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import type { TweetData } from '../lib/twitter-client.js';
import type { PersonaResult, PersonaAnalysisOptions } from '../persona-extraction/types.js';
import { PersonaSynthesizer } from '../persona-extraction/persona-synthesizer.js';
import { TextAnalyzer } from '../persona-extraction/text-analyzer.js';
import { VisionAnalyzer } from '../persona-extraction/vision-analyzer.js';
import { TranscriptionAnalyzer } from '../persona-extraction/transcription-analyzer.js';
import type { OllamaClient } from '../bookmark-enrichment/ollama-client.js';
import type { CliContext } from '../cli/shared.js';
import { normalizeHandle } from '../lib/normalize-handle.js';

/**
 * Command options for persona extraction
 */
interface PersonaExtractOptions {
  source: string;
  mediaDir?: string;
  output: string;
  includeImages?: boolean;
  includeVideos?: boolean;
  ollamaHost?: string;
  ollamaModel?: string;
  maxTweets?: string;
}

/**
 * Tweet data structure from JSON file
 * Allows for flexible JSON formats from different sources
 */
interface TweetJsonData {
  text?: string;
  full_text?: string;
  id?: string | number;
  author?: {
    id?: string;
    username?: string;
    name?: string;
  };
  created_at?: string;
  [key: string]: unknown;
}

/**
 * Register the persona-extract command
 */
export function registerPersonaExtractCommand(program: Command, ctx: CliContext): void {
  program
    .command('persona-extract')
    .description('Extract persona information from Twitter content')
    .argument('<username>', 'Twitter username (e.g., @jh3yy or jh3yy)')
    .option('--source <file>', 'Path to JSON file containing tweets (required)')
    .option('--media-dir <directory>', 'Path to directory containing downloaded media')
    .option('--output <file>', 'Output JSON file path (default: ./persona-<username>.json)')
    .option('--include-images', 'Include image analysis in persona extraction', true)
    .option('--include-videos', 'Include video analysis in persona extraction', true)
    .option('--ollama-host <url>', 'Ollama host URL (default: http://localhost:11434)')
    .option('--ollama-model <name>', 'Ollama model for synthesis (default: qwen2.5:7b)')
    .option('--max-tweets <number>', 'Maximum number of tweets to analyze (default: 100)')
    .action(async (username: string, options: PersonaExtractOptions) => {
      try {
        await extractPersona(username, options, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Persona extraction failed:`, error);
        process.exit(1);
      }
    });
}

/**
 * Extract persona from Twitter content
 */
async function extractPersona(username: string, options: PersonaExtractOptions, ctx: CliContext): Promise<void> {
  // Normalize username
  const normalizedUsername = normalizeHandle(username);
  if (!normalizedUsername) {
    console.error(`${ctx.p('err')}Invalid username: ${username}`);
    console.log(`\nUsername must be a valid Twitter handle (letters, digits, underscore; max 15 characters).`);
    process.exit(2);
  }

  // Validate source file
  if (!options.source) {
    console.error(`${ctx.p('err')}Missing required option: --source`);
    console.log(`\nUsage: xkit persona-extract <username> --source <tweets.json>`);
    console.log(`\nExample:`);
    console.log(`  xkit persona-extract @jh3yy --source ./tweets.json --output ./persona.json`);
    process.exit(2);
  }

  const sourcePath = resolve(options.source);
  if (!existsSync(sourcePath)) {
    console.error(`${ctx.p('err')}Source file not found: ${sourcePath}`);
    process.exit(2);
  }

  // Set output file
  const outputFile = options.output || resolve(`./persona-${normalizedUsername}.json`);

  console.log(`🔍 Extracting persona for @${normalizedUsername}\n`);

  // Step 1: Read tweets from source file
  console.log(`📂 Reading tweets from ${ctx.colors.command(options.source)}...`);
  const tweets = await readTweetsFromFile(sourcePath);

  if (tweets.length === 0) {
    console.error(`${ctx.p('err')}No tweets found in source file`);
    process.exit(1);
  }

  console.log(`   Found ${tweets.length} tweets\n`);

  // Step 2: Extract tweet text
  const tweetTexts = tweets.map((tweet) => tweet.text || '').filter((text) => text.length > 0);

  if (tweetTexts.length === 0) {
    console.error(`${ctx.p('err')}No tweet text found in source file`);
    process.exit(1);
  }

  console.log(`   Extracted ${tweetTexts.length} tweets with text content\n`);

  // Step 3: Load media if media-dir provided
  const imageBuffers: Buffer[] = [];
  const videoPaths: string[] = [];

  if (options.mediaDir && options.includeImages !== false) {
    console.log(`📁 Loading media from ${ctx.colors.command(options.mediaDir)}...`);
    await loadMediaFromDirectory(options.mediaDir, imageBuffers, videoPaths, ctx);
    console.log(`   Found ${imageBuffers.length} images and ${videoPaths.length} videos\n`);
  }

  // Step 4: Initialize analyzers
  console.log(`🔧 Initializing analyzers...`);

  // Dynamically import OllamaClient to avoid top-level import issues
  const { OllamaClient } = await import('../bookmark-enrichment/ollama-client.js');

  const ollamaClient = new OllamaClient({
    host: options.ollamaHost,
    model: options.ollamaModel,
  });

  const textAnalyzer = new TextAnalyzer({ host: options.ollamaHost });
  const visionAnalyzer = new VisionAnalyzer(ollamaClient);
  const transcriptionAnalyzer = new TranscriptionAnalyzer(ollamaClient);

  const synthesizer = new PersonaSynthesizer(
    textAnalyzer,
    visionAnalyzer,
    transcriptionAnalyzer,
    {
      host: options.ollamaHost,
      model: options.ollamaModel,
    }
  );

  console.log(`   Model: ${synthesizer.getModel()}\n`);

  // Step 5: Check Ollama availability
  const isAvailable = await synthesizer.isAvailable();
  if (!isAvailable) {
    console.error(`${ctx.p('err')}Ollama is not available at ${ollamaClient['config']?.host || options.ollamaHost || 'http://localhost:11434'}`);
    console.log(`\nPlease ensure Ollama is running:`);
    console.log(`  - macOS: Install from https://ollama.com and run 'ollama serve'`);
    console.log(`  - Linux: Install and run 'ollama serve'`);
    console.log(`  - Docker: docker run -d -p 11434:11434 ollama/ollama`);
    process.exit(1);
  }

  // Step 6: Configure analysis options
  const maxTweetsResult = ctx.parseIntegerOption(options.maxTweets ?? '100', { name: '--max-tweets', min: 1 });
  const maxTweets = maxTweetsResult.ok ? maxTweetsResult.value : 100;

  const analysisOptions: PersonaAnalysisOptions = {
    includeImages: options.includeImages !== false,
    includeVideos: options.includeVideos !== false,
    maxTweets,
  };

  // Step 7: Run persona synthesis
  console.log(`🧠 Analyzing content and synthesizing persona...\n`);
  console.log(`   This may take a while depending on the amount of content...\n`);

  const startTime = Date.now();
  const result = await synthesizer.synthesize(normalizedUsername, {
    tweets: tweetTexts,
    imageBuffers: imageBuffers.length > 0 ? imageBuffers : undefined,
    videoPaths: videoPaths.length > 0 ? videoPaths : undefined,
    options: analysisOptions,
  });
  const duration = Date.now() - startTime;

  console.log(`✨ Persona synthesis complete in ${(duration / 1000).toFixed(1)}s\n`);

  // Step 8: Write output to file
  console.log(`💾 Writing persona to ${ctx.colors.command(outputFile)}...`);
  await writePersonaResult(outputFile, result);
  console.log(`   Saved successfully\n`);

  // Step 9: Display summary
  displayPersonaSummary(result, ctx);
}

/**
 * Read tweets from JSON file
 */
async function readTweetsFromFile(filePath: string): Promise<TweetData[]> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const rawData = JSON.parse(content);

    // Handle array format
    if (Array.isArray(rawData)) {
      return rawData.map((item, index) => {
        const tweet = item as TweetJsonData;
        const tweetText = tweet.text || tweet.full_text || '';

        return {
          id: typeof tweet.id === 'string' ? tweet.id : String(tweet.id ?? index),
          text: tweetText,
          author: {
            id: tweet.author?.id || 'unknown',
            username: tweet.author?.username || 'unknown',
            name: tweet.author?.name || 'Unknown User',
          },
          createdAt: tweet.created_at || new Date().toISOString(),
        } as TweetData;
      });
    }

    // Handle single object format
    const tweet = rawData as TweetJsonData;
    const tweetText = tweet.text || tweet.full_text || '';

    return [{
      id: typeof tweet.id === 'string' ? tweet.id : String(tweet.id ?? 0),
      text: tweetText,
      author: {
        id: tweet.author?.id || 'unknown',
        username: tweet.author?.username || 'unknown',
        name: tweet.author?.name || 'Unknown User',
      },
      createdAt: tweet.created_at || new Date().toISOString(),
    } as TweetData];
  } catch (error) {
    throw new Error(`Failed to parse tweets file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Load media files from directory
 */
async function loadMediaFromDirectory(
  mediaDir: string,
  imageBuffers: Buffer[],
  videoPaths: string[],
  ctx: CliContext
): Promise<void> {
  const { readdirSync, readFileSync, statSync } = await import('node:fs');

  if (!existsSync(mediaDir)) {
    console.warn(`${ctx.p('warn')}Media directory not found: ${mediaDir}`);
    return;
  }

  try {
    const files = readdirSync(mediaDir);

    for (const file of files) {
      const filePath = resolve(mediaDir, file);
      const stats = statSync(filePath);

      if (!stats.isFile()) {
        continue;
      }

      const ext = file.toLowerCase();

      // Image files
      if (ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp') || ext.endsWith('.gif')) {
        try {
          const buffer = readFileSync(filePath);
          imageBuffers.push(buffer);
        } catch (error) {
          console.warn(`${ctx.p('warn')}Failed to read image ${file}: ${error}`);
        }
      }

      // Video files
      if (ext.endsWith('.mp4') || ext.endsWith('.mov') || ext.endsWith('.avi') || ext.endsWith('.mkv')) {
        videoPaths.push(filePath);
      }
    }
  } catch (error) {
    console.warn(`${ctx.p('warn')}Failed to read media directory: ${error}`);
  }
}

/**
 * Write persona result to JSON file
 */
async function writePersonaResult(outputPath: string, result: PersonaResult): Promise<void> {
  const outputDir = resolve(outputPath, '..');

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write persona result to file
  const { writeFileSync } = await import('node:fs');

  const output = {
    ...result,
    analyzedAt: result.analyzedAt.toISOString(),
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
}

/**
 * Display persona summary to console
 */
function displayPersonaSummary(result: PersonaResult, ctx: CliContext): void {
  console.log(`${ctx.colors.section('─'.repeat(50))}\n`);

  console.log(`${ctx.colors.section('Persona Summary')}\n`);

  // Structured attributes
  console.log(`${ctx.colors.subtitle('Communication Style:')}`);
  console.log(`  ${result.persona.structured.communicationStyle}\n`);

  console.log(`${ctx.colors.subtitle('Technical Level:')}`);
  console.log(`  ${(result.persona.structured.technicalLevel * 100).toFixed(0)}% (${
    result.persona.structured.technicalLevel < 0.33 ? 'beginner' :
    result.persona.structured.technicalLevel < 0.66 ? 'intermediate' :
    result.persona.structured.technicalLevel < 0.9 ? 'advanced' : 'expert'
  })\n`);

  if (result.persona.structured.values.length > 0) {
    console.log(`${ctx.colors.subtitle('Core Values:')}`);
    for (const value of result.persona.structured.values.slice(0, 5)) {
      console.log(`  • ${value}`);
    }
    console.log('');
  }

  if (result.persona.structured.expertise.length > 0) {
    console.log(`${ctx.colors.subtitle('Expertise:')}`);
    for (const exp of result.persona.structured.expertise.slice(0, 5)) {
      console.log(`  • ${exp}`);
    }
    console.log('');
  }

  if (result.persona.structured.topicClusters.length > 0) {
    console.log(`${ctx.colors.subtitle('Topic Clusters:')}`);
    for (const topic of result.persona.structured.topicClusters.slice(0, 5)) {
      console.log(`  • ${topic}`);
    }
    console.log('');
  }

  // Narrative preview (first 200 chars)
  const narrativePreview = result.persona.narrative.slice(0, 200) + (result.persona.narrative.length > 200 ? '...' : '');
  console.log(`${ctx.colors.subtitle('Narrative Preview:')}`);
  console.log(`  ${narrativePreview}\n`);

  // Instructions preview (first 200 chars)
  const instructionsPreview = result.persona.instructions.slice(0, 200) + (result.persona.instructions.length > 200 ? '...' : '');
  console.log(`${ctx.colors.subtitle('Instructions Preview:')}`);
  console.log(`  ${instructionsPreview}\n`);

  console.log(`${ctx.colors.section('─'.repeat(50))}\n`);
}
