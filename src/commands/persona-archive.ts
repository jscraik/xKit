/**
 * Persona archive command
 * Fetches user tweets, extracts persona, and generates skill in one pipeline
 */

import type { Command } from 'commander';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import type { CliContext } from '../cli/shared.js';
import { normalizeHandle } from '../lib/normalize-handle.js';
import { TwitterClient } from '../lib/twitter-client.js';
import { MediaHandler } from '../bookmark-media/index.js';
import {
  TextAnalyzer,
  VisionAnalyzer,
  TranscriptionAnalyzer,
  PersonaSynthesizer,
  type PersonaAnalysisOptions,
} from '../persona-extraction/index.js';
import { SkillWriter } from '../skill-generator/index.js';

interface PersonaArchiveOptions {
  limit?: string;
  target?: string;
  includeMedia?: boolean;
  includeImages?: boolean;
  includeVideos?: boolean;
  model?: string;
  host?: string;
  autoApprove?: boolean;
}

/**
 * Archive user tweets, extract persona, and generate skill
 */
async function archivePersona(
  username: string,
  options: PersonaArchiveOptions,
  program: Command,
  ctx: CliContext
): Promise<void> {
  const opts = program.opts();
  const timeoutMs = ctx.resolveTimeoutFromOptions(opts);
  const startTime = Date.now();

  console.log('🎭 xKit Persona Archiver\n');

  // Parse limit option
  let limit = 100;
  if (options.limit) {
    const limitResult = ctx.parseIntegerOption(options.limit, { name: '--limit', min: 1, max: 200 });
    if (!limitResult.ok) {
      console.error(`${ctx.p('err')}${limitResult.error}`);
      process.exit(2);
    }
    limit = limitResult.value;
  }

  // Normalize username (remove @ if present)
  const normalizedUsername = normalizeHandle(username);
  if (!normalizedUsername) {
    console.error(`${ctx.p('err')}Invalid username: ${username}`);
    process.exit(2);
  }

  // Resolve target directory
  const targetDir = options.target
    ? resolve(options.target)
    : join(homedir(), '.claude', 'skills', 'utilities');

  // Create artifacts directory
  const artifactsDir = join(process.cwd(), 'artifacts', normalizedUsername);
  mkdirSync(artifactsDir, { recursive: true });

  console.log(`📱 Authenticating...`);
  const { cookies, warnings } = await ctx.resolveCredentialsFromOptions(opts);

  for (const warning of warnings) {
    console.error(`${ctx.p('warn')}${warning}`);
  }

  if (!cookies.authToken || !cookies.ct0) {
    console.error(`${ctx.p('err')}Missing required credentials. Run 'xkit setup' first.`);
    process.exit(1);
  }

  // Initialize client
  const client = new TwitterClient({ cookies, timeoutMs });

  // Step 1: Fetch user tweets
  console.log(`\n📥 Fetching tweets from @${normalizedUsername}...`);
  const tweetsResult = await client.getUserTweets(normalizedUsername, limit, { includeRaw: false });

  if (!tweetsResult.success || !tweetsResult.tweets) {
    const error = `Failed to fetch tweets: ${tweetsResult.error}`;
    console.error(`${ctx.p('err')}${error}`);
    process.exit(1);
  }

  const tweets = tweetsResult.tweets;
  console.log(`✅ Fetched ${tweets.length} tweets`);

  // Save tweets to artifacts
  const tweetsPath = join(artifactsDir, 'tweets.json');
  writeFileSync(tweetsPath, JSON.stringify(tweets, null, 2), 'utf8');
  console.log(`💾 Saved tweets to ${tweetsPath}`);

  // Step 2: Extract text content
  const tweetTexts = tweets.map((tweet) => tweet.text).filter(Boolean);

  if (tweetTexts.length === 0) {
    console.error(`${ctx.p('err')}No text content found in tweets`);
    process.exit(1);
  }

  console.log(`📝 Extracted ${tweetTexts.length} text samples`);

  // Step 3: Download media if requested
  let imageBuffers: Buffer[] = [];
  let videoPaths: string[] = [];

  if (options.includeMedia || options.includeImages || options.includeVideos) {
    console.log('\n🖼️  Processing media...');

    const mediaDir = join(artifactsDir, 'media');
    mkdirSync(mediaDir, { recursive: true });

    const mediaHandler = new MediaHandler({
      includeMedia: true,
      downloadMedia: true,
      mediaDir,
    });

    // Collect all media from tweets
    const allMedia = tweets.flatMap((tweet) => tweet.media || []);

    if (allMedia.length > 0) {
      console.log(`   Found ${allMedia.length} media items`);

      // Download media
      const downloadedPaths = await mediaHandler.downloadMedia(
        allMedia.map((m) => ({
          type: m.type,
          url: m.url,
          width: m.width,
          height: m.height,
        })),
        mediaDir
      );

      // Separate images and videos
      for (let i = 0; i < allMedia.length; i++) {
        const media = allMedia[i];
        const path = downloadedPaths[i];

        if (!path) continue;

        if (media.type === 'photo' && options.includeImages !== false) {
          try {
            const { readFile } = await import('node:fs/promises');
            const buffer = await readFile(path);
            imageBuffers.push(buffer);
          } catch (error) {
            console.warn(`${ctx.p('warn')}Failed to read image ${path}`);
          }
        } else if (media.type === 'video' && options.includeVideos !== false) {
          videoPaths.push(path);
        }
      }

      console.log(`   ✅ Downloaded ${imageBuffers.length} images, ${videoPaths.length} videos`);
    } else {
      console.log(`   ℹ️  No media found in tweets`);
    }
  }

  // Step 4: Extract persona
  console.log('\n🧠 Extracting persona...');

  const analysisOptions: PersonaAnalysisOptions = {
    includeImages: options.includeImages !== false,
    includeVideos: options.includeVideos !== false,
    maxTweets: limit,
  };

  // Initialize Ollama client
  const { OllamaClient } = await import('../bookmark-enrichment/ollama-client.js');
  const ollamaClient = new OllamaClient({
    host: options.host || 'http://localhost:11434',
    model: options.model || 'qwen2.5:7b',
  });

  // Initialize analyzers
  const textAnalyzer = new TextAnalyzer({
    host: options.host || 'http://localhost:11434',
    model: options.model || 'qwen2.5:7b',
  });

  const visionAnalyzer = new VisionAnalyzer(ollamaClient);

  const transcriptionAnalyzer = new TranscriptionAnalyzer(ollamaClient);

  const synthesizer = new PersonaSynthesizer(
    textAnalyzer,
    visionAnalyzer,
    transcriptionAnalyzer,
    {
      host: options.host || 'http://localhost:11434',
      model: options.model || 'qwen2.5:7b',
      temperature: 0.7,
    }
  );

  // Check Ollama availability
  const isAvailable = await synthesizer.isAvailable();
  if (!isAvailable) {
    console.error(`${ctx.p('err')}Ollama is not available. Start Ollama with: ollama serve`);
    process.exit(1);
  }

  // Run synthesis
  const personaResult = await synthesizer.synthesize(normalizedUsername, {
    tweets: tweetTexts,
    imageBuffers: imageBuffers.length > 0 ? imageBuffers : undefined,
    videoPaths: videoPaths.length > 0 ? videoPaths : undefined,
    options: analysisOptions,
  });

  console.log(`✅ Persona extracted for @${normalizedUsername}`);

  // Save persona to artifacts
  const personaPath = join(artifactsDir, 'persona.json');
  writeFileSync(personaPath, JSON.stringify(personaResult, null, 2), 'utf8');
  console.log(`💾 Saved persona to ${personaPath}`);

  // Step 5: Generate skill
  console.log('\n✍️  Generating skill...');

  const skillWriter = new SkillWriter({
    outputDir: targetDir,
    autoApprove: options.autoApprove ?? false,
  });

  const skillResult = await skillWriter.writePersonaSkill(personaResult, targetDir);

  if (skillResult.written.length > 0) {
    console.log(`✅ Skill written to ${skillResult.written[0]}`);
  } else if (skillResult.review.length > 0) {
    console.log(`⏳ Skill pending review in ${skillResult.review[0]}`);
    console.log('');
    console.log('   Review and approve with:');
    console.log(`     xkit persona-skill approve ${normalizedUsername}`);
  }

  if (skillResult.errors.length > 0) {
    console.error(`❌ Errors: ${skillResult.errors.map((e) => e.error).join(', ')}`);
  }

  // Step 6: Summary
  const duration = Math.round((Date.now() - startTime) / 1000);

  console.log('\n📊 Summary:');
  console.log(`   Username: @${normalizedUsername}`);
  console.log(`   Tweets analyzed: ${tweets.length}`);
  console.log(`   Images analyzed: ${imageBuffers.length}`);
  console.log(`   Videos analyzed: ${videoPaths.length}`);
  console.log(`   Artifacts: ${artifactsDir}`);
  console.log(`   Skill output: ${targetDir}`);
  console.log(`   Duration: ${duration}s`);

  console.log('\n✨ Done!');
}

/**
 * Register the persona archive command
 */
export function registerPersonaArchiveCommand(program: Command, ctx: CliContext): void {
  program
    .command('persona-archive')
    .description('Archive user tweets, extract persona, and generate skill')
    .argument('<username>', 'Username (e.g., @jh3yy or jh3yy)')
    .option('-n, --limit <number>', 'Number of tweets to fetch (default: 100, max: 200)', '100')
    .option('-t, --target <path>', 'Target directory for skill output', join(homedir(), '.claude', 'skills', 'utilities'))
    .option('--include-media', 'Include all media (images and videos)')
    .option('--include-images', 'Include image analysis')
    .option('--include-videos', 'Include video transcription')
    .option('--model <name>', 'Ollama model to use (default: qwen2.5:7b)', 'qwen2.5:7b')
    .option('--host <url>', 'Ollama host URL (default: http://localhost:11434)', 'http://localhost:11434')
    .option('--auto-approve', 'Write skill directly without review')
    .action(async (username: string, options: PersonaArchiveOptions) => {
      try {
        await archivePersona(username, options, program, ctx);
      } catch (error) {
        console.error(`\n${ctx.p('err')}Persona archive failed:`, error);
        process.exit(1);
      }
    });
}
