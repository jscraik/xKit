/**
 * TextAnalyzer - Analyzes text content for persona extraction
 *
 * Analyzes written content (tweets, posts, etc.) to extract:
 * - Communication style and tone
 * - Technical knowledge level
 * - Core values and beliefs
 * - Areas of expertise
 * - Topic interests and patterns
 *
 * Uses OllamaClient with qwen2.5:7b model for text analysis.
 * Handles missing data gracefully and provides confidence scores.
 * Supports batch processing for large tweet collections.
 */

import { buildTextAnalysisPrompt, type LLMTextAnalysisResult } from './prompts.js';

// Top-level regex for JSON extraction (performance optimization)
const JSON_EXTRACT_REGEX = /\{[\s\S]*\}/;

/**
 * Configuration for TextAnalyzer
 */
export interface TextAnalyzerConfig {
  /**
   * Ollama host URL
   * @default 'http://localhost:11434'
   */
  host?: string;

  /**
   * Model to use for analysis
   * @default 'qwen2.5:7b'
   */
  model?: string;

  /**
   * Maximum number of tweets/posts to analyze at once
   * Prevents token overflow
   * @default 100
   */
  maxTweets?: number;

  /**
   * Number of tweets per batch for batch processing
   * @default 10
   */
  batchSize?: number;

  /**
   * Minimum confidence threshold for returning results
   * @default 0.3
   */
  minConfidence?: number;

  /**
   * Custom prompt for text analysis
   * Defaults to persona-focused prompts if not provided
   */
  customPrompt?: string;
}

/**
 * TextAnalyzer extracts persona-relevant information from text content
 *
 * Responsibilities:
 * - Analyze tweet/post text for communication patterns
 * - Extract topics and expertise areas
 * - Identify values and tone markers
 * - Handle analysis failures gracefully
 * - Support batch processing for large datasets
 * - Return structured results for persona synthesis
 *
 * @example
 * const analyzer = new TextAnalyzer();
 * const result = await analyzer.analyzeTweets(tweets);
 * if (result.confidence > 0.5) {
 *   console.log('Communication style:', result.communicationStyle);
 *   console.log('Topics:', result.topicClusters);
 * }
 *
 * @example
 * // Batch processing for large datasets
 * const analyzer = new TextAnalyzer({ batchSize: 20 });
 * const result = await analyzer.batchAnalyze(hundredsOfTweets);
 */
export class TextAnalyzer {
  private host: string;
  private model: string;
  private config: Omit<Required<TextAnalyzerConfig>, 'host' | 'model'>;

  // Default configuration values
  private readonly DEFAULT_HOST = 'http://localhost:11434';
  private readonly DEFAULT_MODEL = 'qwen2.5:7b';
  private readonly DEFAULT_MAX_TWEETS = 100;
  private readonly DEFAULT_BATCH_SIZE = 10;
  private readonly DEFAULT_MIN_CONFIDENCE = 0.3;

  constructor(config: TextAnalyzerConfig = {}) {
    this.host = config.host ?? this.DEFAULT_HOST;
    this.model = config.model ?? this.DEFAULT_MODEL;
    this.config = {
      maxTweets: config.maxTweets ?? this.DEFAULT_MAX_TWEETS,
      batchSize: config.batchSize ?? this.DEFAULT_BATCH_SIZE,
      minConfidence: config.minConfidence ?? this.DEFAULT_MIN_CONFIDENCE,
      customPrompt: config.customPrompt ?? '',
    };
  }

  /**
   * Analyze tweets/posts for persona extraction
   *
   * Processes up to maxTweets tweets and returns a structured analysis
   * of communication patterns, topics, values, and expertise.
   *
   * @param tweets - Array of tweet/post text content
   * @returns Structured analysis result with communication patterns, topics, values, etc.
   */
  async analyzeTweets(tweets: string[]): Promise<LLMTextAnalysisResult> {
    try {
      // Validate input
      if (!tweets || tweets.length === 0) {
        return this.getDefaultResult('No tweets provided');
      }

      // Limit tweets to max configured
      const tweetsToAnalyze = tweets.slice(0, this.config.maxTweets);

      // Filter out empty tweets
      const validTweets = tweetsToAnalyze.filter((tweet) => tweet && tweet.trim().length > 0);

      if (validTweets.length === 0) {
        return this.getDefaultResult('No valid tweets to analyze');
      }

      // Build the analysis prompt
      const prompt = this.config.customPrompt || buildTextAnalysisPrompt(validTweets);

      // Get analysis from Ollama
      const response = await this.generateWithOllama(prompt);

      // Parse the JSON response
      const result = this.parseAnalysisResponse(response);

      // Check confidence threshold
      if (result.confidence < this.config.minConfidence) {
        console.warn(`Text analysis confidence ${result.confidence} below threshold ${this.config.minConfidence}`);
      }

      return result;
    } catch (error) {
      // Graceful degradation on any error
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Text analysis failed: ${errorMessage}`);
      return this.getDefaultResult(errorMessage);
    }
  }

  /**
   * Analyze tweets in batches for better handling of large datasets
   *
   * This method processes tweets in configurable batch sizes and aggregates
   * the results. Useful for accounts with many tweets.
   *
   * @param tweets - Array of tweet/post text content
   * @param batchSize - Optional override for batch size (defaults to config value)
   * @returns Aggregated LLMTextAnalysisResult across all batches
   *
   * @example
   * const analyzer = new TextAnalyzer({ batchSize: 20 });
   * const result = await analyzer.batchAnalyze(hundredsOfTweets);
   */
  async batchAnalyze(tweets: string[], batchSize?: number): Promise<LLMTextAnalysisResult> {
    const size = batchSize ?? this.config.batchSize;

    // Validate input
    if (!tweets || tweets.length === 0) {
      return this.getDefaultResult('No tweets provided for batch analysis');
    }

    const validTweets = tweets.filter((tweet) => tweet && tweet.trim().length > 0);

    if (validTweets.length === 0) {
      return this.getDefaultResult('No valid tweets provided for batch analysis');
    }

    // If tweets fit in one batch, use single analysis
    if (validTweets.length <= size) {
      return this.analyzeTweets(validTweets);
    }

    try {
      // Process batches
      const batches: string[][] = [];
      for (let i = 0; i < validTweets.length; i += size) {
        batches.push(validTweets.slice(i, i + size));
      }

      console.debug(`Processing ${batches.length} batches of ~${size} tweets each`);

      // Analyze each batch
      const results: LLMTextAnalysisResult[] = [];
      for (let i = 0; i < batches.length; i++) {
        console.debug(`Processing batch ${i + 1}/${batches.length} (${batches[i].length} tweets)`);
        const batchResult = await this.analyzeTweets(batches[i]);
        results.push(batchResult);
      }

      // Aggregate results
      return this.aggregateResults(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Batch analysis failed: ${errorMessage}`);
      return this.getDefaultResult(errorMessage);
    }
  }

  /**
   * Generate a completion using Ollama
   *
   * @param prompt - Prompt to send to Ollama
   * @returns Raw response from Ollama
   */
  private async generateWithOllama(prompt: string): Promise<string> {
    // Dynamic import to avoid top-level import issues
    const { Ollama } = await import('ollama');

    const client = new Ollama({ host: this.host });

    try {
      const response = await client.generate({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
        },
      });

      return response.response.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Ollama generation failed: ${errorMessage}`);
    }
  }

  /**
   * Parse the analysis response from Ollama
   *
   * @param response - Raw response from Ollama
   * @returns Parsed LLMTextAnalysisResult
   */
  private parseAnalysisResponse(response: string): LLMTextAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(JSON_EXTRACT_REGEX);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate required fields
      const result: LLMTextAnalysisResult = {
        communicationStyle: parsed.communicationStyle || 'unknown',
        technicalLevel: parsed.technicalLevel || 'intermediate',
        values: Array.isArray(parsed.values) ? parsed.values : [],
        expertise: Array.isArray(parsed.expertise) ? parsed.expertise : [],
        toneMarkers: Array.isArray(parsed.toneMarkers) ? parsed.toneMarkers : [],
        topicClusters: Array.isArray(parsed.topicClusters) ? parsed.topicClusters : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };

      return result;
    } catch (error) {
      console.warn('Failed to parse text analysis response:', error);
      return this.getDefaultResult('Failed to parse response');
    }
  }

  /**
   * Aggregate results from multiple batch analyses
   *
   * Combines communication styles, merges values/expertise/topics,
   * and calculates an average confidence score.
   *
   * @param results - Array of LLMTextAnalysisResult from batches
   * @returns Aggregated LLMTextAnalysisResult
   */
  private aggregateResults(results: LLMTextAnalysisResult[]): LLMTextAnalysisResult {
    // Combine all unique values
    const allValues = new Set<string>();
    const allExpertise = new Set<string>();
    const allToneMarkers = new Set<string>();
    const allTopicClusters = new Set<string>();
    const communicationStyles: string[] = [];
    const technicalLevels: string[] = [];
    let totalConfidence = 0;

    for (const result of results) {
      for (const v of result.values) {
        allValues.add(v);
      }
      for (const e of result.expertise) {
        allExpertise.add(e);
      }
      for (const t of result.toneMarkers) {
        allToneMarkers.add(t);
      }
      for (const t of result.topicClusters) {
        allTopicClusters.add(t);
      }
      communicationStyles.push(result.communicationStyle);
      technicalLevels.push(result.technicalLevel);
      totalConfidence += result.confidence;
    }

    // Determine dominant communication style (most common)
    const styleCounts = new Map<string, number>();
    for (const style of communicationStyles) {
      styleCounts.set(style, (styleCounts.get(style) || 0) + 1);
    }
    const dominantStyle = Array.from(styleCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

    // Determine highest technical level
    const techOrder = ['beginner', 'intermediate', 'advanced', 'expert'];
    const maxTechIndex = Math.max(...technicalLevels.map((t) => techOrder.indexOf(t) ?? 1));
    const dominantTech = techOrder[Math.min(maxTechIndex, techOrder.length - 1)] || 'intermediate';

    // Calculate average confidence
    const avgConfidence = totalConfidence / results.length;

    return {
      communicationStyle: dominantStyle,
      technicalLevel: dominantTech,
      values: Array.from(allValues),
      expertise: Array.from(allExpertise),
      toneMarkers: Array.from(allToneMarkers),
      topicClusters: Array.from(allTopicClusters),
      confidence: avgConfidence,
    };
  }

  /**
   * Get default/empty result when analysis fails
   *
   * @param _reason - Reason for failure (logged but not returned)
   * @returns Default LLMTextAnalysisResult with low confidence
   */
  private getDefaultResult(_reason: string): LLMTextAnalysisResult {
    return {
      communicationStyle: 'unknown',
      technicalLevel: 'intermediate',
      values: [],
      expertise: [],
      toneMarkers: [],
      topicClusters: [],
      confidence: 0,
    };
  }

  /**
   * Update analyzer configuration
   *
   * @param config - New configuration options
   */
  configure(config: Partial<TextAnalyzerConfig>): void {
    if (config.maxTweets !== undefined) {
      this.config.maxTweets = config.maxTweets;
    }
    if (config.batchSize !== undefined) {
      this.config.batchSize = config.batchSize;
    }
    if (config.minConfidence !== undefined) {
      this.config.minConfidence = config.minConfidence;
    }
    if (config.customPrompt !== undefined) {
      this.config.customPrompt = config.customPrompt;
    }
    // Note: host and model changes would require recreating internal state
    // This is intentional to avoid connection issues during reconfiguration
  }

  /**
   * Check if Ollama is available
   *
   * @returns True if Ollama is available and responding
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { Ollama } = await import('ollama');
      const client = new Ollama({ host: this.host });
      await client.list();
      return true;
    } catch {
      return false;
    }
  }
}

// Note: TextAnalysisResult type is exported from types.ts
// For the extended LLM result, use LLMTextAnalysisResult from prompts.ts
