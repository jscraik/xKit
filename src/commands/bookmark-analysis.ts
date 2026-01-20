/**
 * Bookmark analysis command
 * Analyzes exported bookmarks using LLM categorization, usefulness scoring, and custom scripts
 * Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.3, 6.1, 6.2, 7.1
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Command } from 'commander';
import type { Analyzer } from '../bookmark-analysis/analysis-engine.js';
import { AnalysisEngine } from '../bookmark-analysis/analysis-engine.js';
import { AnalysisOutputWriter } from '../bookmark-analysis/analysis-output-writer.js';
import { LLMCategorizer } from '../bookmark-analysis/llm-categorizer.js';
import { ScriptRunner } from '../bookmark-analysis/script-runner.js';
import type { LLMConfig, ScoringConfig } from '../bookmark-analysis/types.js';
import { UsefulnessScorer } from '../bookmark-analysis/usefulness-scorer.js';
import { logger } from '../bookmark-export/logger.js';
import type { CliContext } from '../cli/shared.js';
import { DEFAULT_MODEL_TIERS, PREDEFINED_STRATEGIES } from '../bookmark-analysis/model-config.js';
import type { RouterConfig } from '../bookmark-analysis/model-router.js';
import { BookmarkEmbedder } from '../bookmark-analysis/bookmark-embedder.js';
import { VectorStore } from '../bookmark-analysis/vector-store.js';

/**
 * Configuration structure for bookmark analysis
 */
interface AnalysisConfig {
  llm?: {
    provider: 'openai' | 'anthropic' | 'ollama';
    apiKey: string;
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
  scoring?: {
    method: 'llm' | 'heuristic' | 'hybrid';
    llmWeight?: number;
    heuristicWeight?: number;
  };
  scripts?: string[];
  output?: {
    directory: string;
    filenamePattern: string;
  };
}

/**
 * Load configuration from .bookmark-analysis.config.json
 */
function loadConfig(configPath: string): AnalysisConfig {
  const defaultConfig: AnalysisConfig = {
    llm: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
      model: process.env.LLM_MODEL,
      maxTokens: 500,
      temperature: 0.7,
    },
    scoring: {
      method: 'hybrid',
      llmWeight: 0.6,
      heuristicWeight: 0.4,
    },
    scripts: [],
    output: {
      directory: './analysis',
      filenamePattern: 'bookmarks_analysis_{timestamp}.json',
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
    const config = JSON.parse(configContent) as Partial<AnalysisConfig>;

    // Merge with defaults
    return {
      llm: config.llm ? { ...defaultConfig.llm, ...config.llm } : defaultConfig.llm,
      scoring: config.scoring ? { ...defaultConfig.scoring, ...config.scoring } : defaultConfig.scoring,
      scripts: config.scripts || defaultConfig.scripts,
      output: config.output ? { ...defaultConfig.output, ...config.output } : defaultConfig.output,
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
 * Handle embedding operations (--embed and --similar)
 */
async function handleEmbeddingOperations(
  options: {
    embed?: boolean;
    similar?: string;
    embeddingModel?: string;
    ollamaHost?: string;
  },
  exportData: { bookmarks: Array<{ id: string; text: string; authorUsername?: string }> }
): Promise<void> {
  const { mkdirSync, writeFileSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');

  // Ollama host configuration - user's custom path
  const ollamaHost = options.ollamaHost || process.env.OLLAMA_HOST || 'http://localhost:11434';
  console.log(`\n📊 Ollama Embeddings (${ollamaHost})`);

  const embedder = new BookmarkEmbedder({
    model: options.embeddingModel || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
    host: ollamaHost,
  });

  // Check if Ollama is available
  const available = await embedder.isAvailable();
  if (!available) {
    console.error(`❌ Ollama not available at ${ollamaHost}`);
    console.error('   Make sure Ollama is running:');
    console.error('   - Start Ollama: ollama serve');
    console.error('   - Pull embedding model: ollama pull nomic-embed-text');
    console.error('   - Available models:', 'mxbai-embed-large, snowflake-arctic-embed2, qwen3-embedding, nomic-embed-text');
    process.exit(1);
  }

  console.log(`✅ Ollama connected`);

  const vectorStore = new VectorStore();
  const embeddingsDir = join('.', 'embeddings');

  // Try to load existing embeddings
  const embeddingsFile = join(embeddingsDir, 'embeddings.json');
  if (existsSync(embeddingsFile)) {
    console.log(`📂 Loading existing embeddings from ${embeddingsFile}...`);
    const { embeddings } = JSON.parse(readFileSync(embeddingsFile, 'utf-8'));
    vectorStore.addBatch(embeddings);
    console.log(`   Loaded ${embeddings.length} embeddings`);
  }

  // Generate embeddings if requested
  if (options.embed) {
    console.log('\n🔄 Generating embeddings...');
    const bookmarks = exportData.bookmarks;

    const startTime = Date.now();
    const results = await embedder.embedBatch(bookmarks, (current, total) => {
      const progress = Math.round((current / total) * 100);
      process.stdout.write(`\r  Progress: ${current}/${total} (${progress}%)`);
    });

    console.log(`\r  ✓ Generated ${results.successCount} embeddings${' '.repeat(30)}`);

    // Add successful embeddings to vector store
    vectorStore.addBatch(results.successful);

    // Save embeddings to disk using VectorStore's save method
    mkdirSync(embeddingsDir, { recursive: true });
    vectorStore.save(embeddingsFile);
    console.log(`💾 Saved embeddings to ${embeddingsFile}`);

    // Show failure summary if any
    if (results.failureCount > 0) {
      console.log(`\n⚠️  ${results.failureCount} bookmarks failed to embed (see warnings above)`);
    }

    const stats = embedder.getStats();
    console.log(`\n⏱️  Average time per embedding: ${Math.round(stats.averageTime)}ms`);
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`⏱️  Total time: ${totalTime}s`);
  }

  // Find similar bookmarks if requested
  if (options.similar) {
    const targetId = options.similar;

    if (!vectorStore.has(targetId)) {
      console.error(`\n❌ Bookmark '${targetId}' not found in embeddings`);
      console.error('   Run with --embed first to generate embeddings');
      process.exit(1);
    }

    console.log(`\n🔍 Finding bookmarks similar to '${targetId}'...`);

    const similar = vectorStore.findSimilar(targetId, {
      limit: 10,
      minSimilarity: 0.6,
    });

    if (similar.length === 0) {
      console.log('   No similar bookmarks found');
    } else {
      console.log(`\n   Top ${similar.length} similar bookmarks:\n`);
      for (const result of similar) {
        const bookmark = exportData.bookmarks.find(b => b.id === result.bookmarkId);
        if (bookmark) {
          const score = (result.similarity * 100).toFixed(1);
          const preview = bookmark.text.substring(0, 80).replace(/\n/g, ' ');
          console.log(`   ${score}%  [${result.bookmarkId}]`);
          console.log(`       ${preview}${bookmark.text.length > 80 ? '...' : ''}`);
          if (bookmark.authorUsername) {
            console.log(`       by @${bookmark.authorUsername}`);
          }
          console.log('');
        }
      }
    }
  }

  // Show vector store stats
  const storeStats = vectorStore.getStats();
  console.log(`\n📊 Vector Store:`);
  console.log(`   Total embeddings: ${storeStats.totalEmbeddings}`);
  console.log(`   Dimensions: ${storeStats.dimensions}`);
  console.log(`   Memory: ~${(storeStats.memoryBytes / 1024 / 1024).toFixed(2)} MB`);
}

/**
 * Analyze bookmarks command handler
 */
async function analyzeBookmarks(options: {
  input: string;
  output?: string;
  method?: 'llm' | 'heuristic' | 'hybrid';
  scripts?: string;
  config?: string;
  modelStrategy?: 'fast' | 'balanced' | 'quality' | 'optimized';
  embed?: boolean;
  similar?: string;
  embeddingModel?: string;
  ollamaHost?: string;
}): Promise<void> {
  const configPath = options.config || '.bookmark-analysis.config.json';

  try {
    // Load configuration
    const config = loadConfig(configPath);

    // Override scoring method if provided via CLI
    if (options.method && config.scoring) {
      config.scoring.method = options.method;
    }

    // Override scripts if provided via CLI
    if (options.scripts) {
      config.scripts = options.scripts.split(',').map((s) => s.trim());
    }

    // Resolve input file path
    const inputPath = resolve(options.input);
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    console.log(`Reading bookmarks from ${inputPath}...`);

    // Read and parse input file
    const inputContent = readFileSync(inputPath, 'utf-8');
    const exportData = JSON.parse(inputContent);

    console.log(`Found ${exportData.bookmarks?.length || 0} bookmarks to analyze`);

    // Initialize analysis engine
    const analyzers: Analyzer[] = [];

    // Add LLM categorizer if configured
    if (config.llm && config.llm.apiKey) {
      console.log('Initializing LLM categorizer...');
      const llmConfig: LLMConfig = {
        provider: config.llm.provider,
        model: config.llm.model || 'gpt-4',
        apiKey: config.llm.apiKey,
        prompt: 'Categorize this bookmark into relevant categories',
        maxCategories: 5,
      };

      // Configure model router if strategy specified
      let routerConfig: RouterConfig | undefined;
      if (options.modelStrategy) {
        console.log(`Using model strategy: ${options.modelStrategy}`);
        routerConfig = {
          tiers: DEFAULT_MODEL_TIERS,
          strategy: PREDEFINED_STRATEGIES[options.modelStrategy],
        };
      }

      const categorizer = new LLMCategorizer(llmConfig, routerConfig);
      analyzers.push(categorizer);
    } else {
      console.log('Skipping LLM categorization (no API key configured)');
    }

    // Add usefulness scorer if configured
    if (config.scoring) {
      console.log(`Initializing usefulness scorer (method: ${config.scoring.method})...`);
      const scoringConfig: ScoringConfig = {
        method: config.scoring.method,
        weights: {
          engagement: 0.4,
          recency: 0.3,
          contentQuality: 0.3,
        },
        llmConfig:
          config.llm && config.llm.apiKey
            ? {
                provider: config.llm.provider,
                model: config.llm.model || 'gpt-4',
                apiKey: config.llm.apiKey,
                prompt: 'Rate the usefulness of this bookmark',
                maxCategories: 1,
              }
            : undefined,
      };
      const scorer = new UsefulnessScorer(scoringConfig);
      analyzers.push(scorer);
    }

    // Add custom script runners if configured
    if (config.scripts && config.scripts.length > 0) {
      console.log(`Loading ${config.scripts.length} custom analysis script(s)...`);
      for (const scriptPath of config.scripts) {
        const resolvedScriptPath = resolve(scriptPath);
        if (!existsSync(resolvedScriptPath)) {
          logger.warn('Script file not found, skipping', { scriptPath: resolvedScriptPath });
          console.warn(`Warning: Script not found: ${resolvedScriptPath}`);
          continue;
        }
        const scriptRunner = new ScriptRunner();
        await scriptRunner.loadScript(resolvedScriptPath);
        analyzers.push(scriptRunner);
      }
    }

    const analysisEngine = new AnalysisEngine({
      analyzers,
      scoringMethod: config.scoring?.method || 'none',
      logger,
    });

    // Run analysis
    console.log('Analyzing bookmarks...');
    const analysisResult = await analysisEngine.analyzeExport(exportData);

    // Write output
    const outputWriter = new AnalysisOutputWriter({
      outputDirectory: config.output?.directory || './analysis',
      filenamePattern: config.output?.filenamePattern || 'bookmarks_analysis_{timestamp}.json',
    });

    const outputPath = options.output ? resolve(options.output) : await outputWriter.write(analysisResult);

    if (options.output) {
      // If custom output path specified, write directly
      const { mkdirSync, writeFileSync } = await import('node:fs');
      const { dirname } = await import('node:path');
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, JSON.stringify(analysisResult, null, 2), 'utf-8');
    }

    // Display completion summary
    const errorSummary = analysisEngine.getErrorSummary();
    console.log('\nAnalysis complete!');
    console.log(`Total bookmarks analyzed: ${analysisResult.bookmarks.length}`);
    console.log(`Successful analyses: ${analysisResult.bookmarks.length - errorSummary.totalErrors}`);
    console.log(`Failed analyses: ${errorSummary.totalErrors}`);
    console.log(`Output file: ${outputPath}`);

    logger.info('Analysis completed successfully', {
      totalBookmarks: analysisResult.bookmarks.length,
      successfulAnalyses: analysisResult.bookmarks.length - errorSummary.totalErrors,
      failedAnalyses: errorSummary.totalErrors,
      outputPath,
    });

    // Embeddings functionality
    if (options.embed || options.similar) {
      await handleEmbeddingOperations(options, exportData);
    }
  } catch (error) {
    logger.error('Analysis failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`\nError: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Register the bookmark analysis command with Commander
 */
export function registerBookmarkAnalysisCommand(program: Command, ctx: CliContext): void {
  program
    .command('analyze-bookmarks')
    .description('Analyze exported bookmarks using LLM and custom scripts')
    .requiredOption('--input <file>', 'Input JSON file with exported bookmarks')
    .option('--output <file>', 'Output file path for analysis results')
    .option(
      '--method <method>',
      'Scoring method: llm, heuristic, or hybrid (default: hybrid)',
      /^(llm|heuristic|hybrid)$/,
    )
    .option('--scripts <paths>', 'Comma-separated list of custom analysis script paths')
    .option('--config <path>', 'Path to configuration file (default: .bookmark-analysis.config.json)')
    .option('--model-strategy <strategy>', 'Model cost optimization strategy: fast, balanced, quality, or optimized (default: balanced)', /^(fast|balanced|quality|optimized)$/)
    .option('--embed', 'Generate semantic embeddings using local Ollama (requires Ollama running)')
    .option('--similar <id>', 'Find bookmarks similar to the given bookmark ID (requires embeddings)')
    .option('--embedding-model <name>', 'Ollama embedding model (default: nomic-embed-text). Available: mxbai-embed-large, snowflake-arctic-embed2, qwen3-embedding, nomic-embed-text', 'nomic-embed-text')
    .option('--ollama-host <url>', 'Ollama host URL (default: http://localhost:11434)', 'http://localhost:11434')
    .action(async (options) => {
      await analyzeBookmarks(options);
    });
}
