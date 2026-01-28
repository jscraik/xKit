/**
 * Persona Synthesizer - Orchestrates all analyzers to create comprehensive persona
 *
 * This class coordinates the entire persona extraction pipeline:
 * - Runs text analysis on tweets/posts
 * - Runs image analysis on visual content
 * - Runs video analysis on video content
 * - Synthesizes all signals into a unified persona
 * - Generates structured + narrative + instructions outputs
 *
 * Handles missing data gracefully and provides fallback behaviors.
 */

import type {
  PersonaResult,
  PersonaData,
  PersonaStructured,
  PersonaAnalysisOptions,
} from './types.js';
import type { LLMTextAnalysisResult } from './prompts.js';
import { VisionAnalyzer, type ImageAnalysisResult } from './vision-analyzer.js';
import { TranscriptionAnalyzer, type VideoAnalysisResult } from './transcription-analyzer.js';
import { TextAnalyzer } from './text-analyzer.js';
import { buildSynthesisPrompt, type SynthesisInputs, type SynthesisResult } from './prompts.js';

/**
 * Inputs for persona synthesis
 */
export interface PersonaSynthesisInputs {
  /** Tweets/posts text content */
  tweets: string[];

  /** Optional image buffers for visual analysis */
  imageBuffers?: Buffer[];

  /** Optional video paths for transcription and speech analysis */
  videoPaths?: string[];

  /** Optional analysis configuration */
  options?: PersonaAnalysisOptions;
}

/**
 * Configuration for PersonaSynthesizer
 */
export interface PersonaSynthesizerConfig {
  /** Ollama host URL */
  host?: string;

  /** Model to use for synthesis */
  model?: string;

  /** Temperature for LLM synthesis (0-1) */
  temperature?: number;
}

/**
 * PersonaSynthesizer orchestrates all analyzers to extract comprehensive persona data
 *
 * This is the main entry point for persona extraction from Twitter content.
 * It coordinates multiple analyzers, combines their results, and generates
 * a complete persona profile.
 *
 * @example
 * const synthesizer = new PersonaSynthesizer(textAnalyzer, visionAnalyzer, transcriptionAnalyzer, {
 *   host: 'http://localhost:11434',
 *   model: 'qwen2.5:7b'
 * });
 * const result = await synthesizer.synthesize('username', {
 *   tweets: ['tweet1', 'tweet2'],
 *   imageBuffers: [imageBuffer1],
 *   options: { includeImages: true, includeVideos: false }
 * });
 * console.log(result.persona.narrative);
 */
export class PersonaSynthesizer {
  private textAnalyzer: TextAnalyzer;
  private visionAnalyzer: VisionAnalyzer;
  private transcriptionAnalyzer: TranscriptionAnalyzer;
  private config: Required<PersonaSynthesizerConfig>;

  // Default configuration values
  private readonly DEFAULT_HOST = 'http://localhost:11434';
  private readonly DEFAULT_MODEL = 'qwen2.5:7b';
  private readonly DEFAULT_TEMPERATURE = 0.7;

  /**
   * Create a new PersonaSynthesizer
   *
   * @param textAnalyzer - Text content analyzer
   * @param visionAnalyzer - Visual content analyzer
   * @param transcriptionAnalyzer - Video transcription analyzer
   * @param config - Optional synthesis configuration
   */
  constructor(
    textAnalyzer: TextAnalyzer,
    visionAnalyzer: VisionAnalyzer,
    transcriptionAnalyzer: TranscriptionAnalyzer,
    config: PersonaSynthesizerConfig = {}
  ) {
    this.textAnalyzer = textAnalyzer;
    this.visionAnalyzer = visionAnalyzer;
    this.transcriptionAnalyzer = transcriptionAnalyzer;
    this.config = {
      host: config.host ?? this.DEFAULT_HOST,
      model: config.model ?? this.DEFAULT_MODEL,
      temperature: config.temperature ?? this.DEFAULT_TEMPERATURE,
    };
  }

  /**
   * Synthesize a complete persona from multiple content sources
   *
   * This method orchestrates the entire persona extraction pipeline:
   * 1. Runs text analysis on tweets (if provided)
   * 2. Runs image analysis on media (if provided and includeImages is true)
   * 3. Runs video analysis on videos (if provided and includeVideos is true)
   * 4. Combines all signals using buildSynthesisPrompt()
   * 5. Calls Ollama to generate final persona
   * 6. Parses and returns PersonaResult
   *
   * @param username - Twitter username (without @)
   * @param inputs - Content to analyze
   * @returns Complete persona result with structured, narrative, and instructions
   *
   * @example
   * const result = await synthesizer.synthesize('devuser', {
   *   tweets: ['Check out this new React feature!', 'CSS is awesome'],
   *   imageBuffers: [screenshotBuffer],
   *   videoPaths: [],
   *   options: { includeImages: true, includeVideos: false }
   * });
   */
  async synthesize(username: string, inputs: PersonaSynthesisInputs): Promise<PersonaResult> {
    const { tweets, imageBuffers, videoPaths, options = {} } = inputs;

    // Validate username
    if (!username || username.trim().length === 0) {
      throw new Error('Username is required for persona synthesis');
    }

    // Step 1: Run text analysis on tweets
    const textAnalysis = await this.analyzeText(tweets, options);

    // Step 2: Run image analysis (if enabled and images provided)
    const imageAnalyses = await this.analyzeImages(imageBuffers, options);

    // Step 3: Run video analysis (if enabled and videos provided)
    const videoAnalyses = await this.analyzeVideos(videoPaths, options);

    // Step 4: Combine all signals and build synthesis prompt
    const synthesisPrompt = this.buildSynthesisPrompt(username, textAnalysis, imageAnalyses, videoAnalyses);

    // Step 5: Call Ollama to generate final persona
    const synthesis = await this.generateSynthesis(synthesisPrompt, username);

    // Step 6: Build and return PersonaResult
    return this.buildPersonaResult(username, synthesis);
  }

  /**
   * Analyze text content from tweets/posts
   *
   * @param tweets - Array of tweet text
   * @param options - Analysis options
   * @returns Text analysis result or undefined if no tweets
   */
  private async analyzeText(
    tweets: string[],
    options: PersonaAnalysisOptions
  ): Promise<LLMTextAnalysisResult | undefined> {
    if (!tweets || tweets.length === 0) {
      console.debug('No tweets provided, skipping text analysis');
      return undefined;
    }

    const maxTweets = options.maxTweets ?? 100;
    const tweetsToAnalyze = tweets.slice(0, maxTweets);

    try {
      console.debug(`Analyzing ${tweetsToAnalyze.length} tweets...`);
      const result = await this.textAnalyzer.analyzeTweets(tweetsToAnalyze);
      console.debug(`Text analysis complete, confidence: ${result.confidence}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Text analysis failed: ${errorMessage}`);
      return undefined;
    }
  }

  /**
   * Analyze image buffers for visual persona signals
   *
   * @param imageBuffers - Array of image buffers
   * @param options - Analysis options
   * @returns Array of image analysis results
   */
  private async analyzeImages(
    imageBuffers: Buffer[] | undefined,
    options: PersonaAnalysisOptions
  ): Promise<ImageAnalysisResult[]> {
    const includeImages = options.includeImages !== false; // Default true

    if (!includeImages || !imageBuffers || imageBuffers.length === 0) {
      console.debug('Image analysis disabled or no images provided, skipping');
      return [];
    }

    const results: ImageAnalysisResult[] = [];

    for (let i = 0; i < imageBuffers.length; i++) {
      try {
        console.debug(`Analyzing image ${i + 1}/${imageBuffers.length}...`);
        const result = await this.visionAnalyzer.analyzeImage(imageBuffers[i]);
        results.push(result);
        console.debug(`Image ${i + 1} analysis complete, success: ${result.success}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Image ${i + 1} analysis failed: ${errorMessage}`);
        // Continue with other images even if one fails
      }
    }

    return results;
  }

  /**
   * Analyze videos for speech patterns and presentation style
   *
   * @param videoPaths - Array of video file paths
   * @param options - Analysis options
   * @returns Array of video analysis results
   */
  private async analyzeVideos(
    videoPaths: string[] | undefined,
    options: PersonaAnalysisOptions
  ): Promise<VideoAnalysisResult[]> {
    const includeVideos = options.includeVideos !== false; // Default true

    if (!includeVideos || !videoPaths || videoPaths.length === 0) {
      console.debug('Video analysis disabled or no videos provided, skipping');
      return [];
    }

    const results: VideoAnalysisResult[] = [];

    for (let i = 0; i < videoPaths.length; i++) {
      try {
        console.debug(`Analyzing video ${i + 1}/${videoPaths.length}...`);
        const result = await this.transcriptionAnalyzer.transcribe(videoPaths[i]);
        results.push(result);
        console.debug(`Video ${i + 1} analysis complete, confidence: ${result.confidence}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`Video ${i + 1} analysis failed: ${errorMessage}`);
        // Continue with other videos even if one fails
      }
    }

    return results;
  }

  /**
   * Build synthesis prompt from all analysis results
   *
   * @param username - Twitter username
   * @param textAnalysis - Text analysis result
   * @param imageAnalyses - Image analysis results
   * @param videoAnalyses - Video analysis results
   * @returns Synthesis prompt string
   */
  private buildSynthesisPrompt(
    username: string,
    textAnalysis: LLMTextAnalysisResult | undefined,
    imageAnalyses: ImageAnalysisResult[],
    videoAnalyses: VideoAnalysisResult[]
  ): string {
    const inputs: SynthesisInputs = {
      username,
      textAnalysis,
      imageAnalyses: imageAnalyses.length > 0 ? imageAnalyses : undefined,
      videoAnalyses: videoAnalyses.length > 0 ? videoAnalyses : undefined,
    };

    return buildSynthesisPrompt(inputs);
  }

  /**
   * Generate persona synthesis using Ollama LLM
   *
   * @param prompt - Synthesis prompt
   * @param username - Twitter username
   * @returns Synthesis result with structured, narrative, and instructions
   */
  private async generateSynthesis(prompt: string, username: string): Promise<SynthesisResult> {
    try {
      console.debug(`Generating persona synthesis for @${username}...`);

      const response = await this.callOllama(prompt);
      const result = this.parseSynthesisResponse(response);

      console.debug(`Persona synthesis complete for @${username}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Persona synthesis failed for @${username}: ${errorMessage}`);
      throw new Error(`Failed to generate persona synthesis: ${errorMessage}`);
    }
  }

  /**
   * Call Ollama LLM for synthesis
   *
   * @param prompt - Synthesis prompt
   * @returns Raw LLM response
   */
  private async callOllama(prompt: string): Promise<string> {
    // Dynamic import to avoid top-level import issues
    const { Ollama } = await import('ollama');

    const client = new Ollama({ host: this.config.host });

    try {
      const response = await client.generate({
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature,
          top_p: 0.9,
        },
      });

      return response.response.trim();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Ollama synthesis failed: ${errorMessage}`);
    }
  }

  /**
   * Parse synthesis response from Ollama
   *
   * @param response - Raw LLM response
   * @returns Parsed synthesis result
   */
  private parseSynthesisResponse(response: string): SynthesisResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in synthesis response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.structured || !parsed.narrative || !parsed.instructions) {
        throw new Error('Invalid synthesis result structure');
      }

      return {
        structured: parsed.structured,
        narrative: parsed.narrative,
        instructions: parsed.instructions,
      };
    } catch (error) {
      console.error('Failed to parse synthesis response:', error);
      throw new Error('Invalid synthesis response format');
    }
  }

  /**
   * Build final PersonaResult from synthesis
   *
   * @param username - Twitter username
   * @param synthesis - Synthesis result
   * @returns Complete persona result
   */
  private buildPersonaResult(username: string, synthesis: SynthesisResult): PersonaResult {
    // Map synthesis result to PersonaResult structure
    const persona: PersonaData = {
      structured: {
        communicationStyle: synthesis.structured.communicationStyle,
        technicalLevel: this.mapTechnicalLevel(synthesis.structured.technicalLevel),
        values: synthesis.structured.values || [],
        expertise: synthesis.structured.expertise || [],
        toneMarkers: [], // Could be extracted from narrative or added later
        topicClusters: synthesis.structured.topics || [],
      },
      narrative: synthesis.narrative,
      instructions: synthesis.instructions,
    };

    return {
      username,
      analyzedAt: new Date(),
      persona,
    };
  }

  /**
   * Map technical level string to number (0-1)
   *
   * @param level - Technical level string
   * @returns Numeric technical level
   */
  private mapTechnicalLevel(level: string): number {
    const levelMap: Record<string, number> = {
      beginner: 0.25,
      intermediate: 0.5,
      advanced: 0.75,
      expert: 1.0,
    };

    const normalized = level.toLowerCase();
    return levelMap[normalized] ?? 0.5;
  }

  /**
   * Check if Ollama is available for synthesis
   *
   * @returns True if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { Ollama } = await import('ollama');
      const client = new Ollama({ host: this.config.host });
      await client.list();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current Ollama model
   *
   * @returns Current model name
   */
  getModel(): string {
    return this.config.model;
  }

  /**
   * Get current Ollama host
   *
   * @returns Current host URL
   */
  getHost(): string {
    return this.config.host;
  }
}
