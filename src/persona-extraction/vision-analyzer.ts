/**
 * Vision Analyzer - Analyzes images for persona extraction
 *
 * Analyzes visual content from Twitter posts to extract:
 * - Visual style (minimalist, colorful, professional, casual, etc.)
 * - Content type (people, products, code screenshots, diagrams, etc.)
 * - Visible text within images
 * - Aesthetic patterns and themes
 *
 * Uses OllamaClient with vision capabilities (llava model).
 * Falls back gracefully if vision model is unavailable.
 */

import type { OllamaClient } from '../bookmark-enrichment/ollama-client.js';

// Top-level regex for field label detection (performance optimization)
const FIELD_LABEL_REGEX = /^(style|content|visible|aesthetic|summary)/;

/**
 * Result of image analysis for persona extraction
 */
export interface ImageAnalysisResult {
  /**
   * Visual style conveyed by the image
   * Examples: minimalist, colorful, professional, casual, dark, vibrant, etc.
   */
  style: string;

  /**
   * Main content shown in the image
   * Examples: people, products, code screenshots, diagrams, charts, landscapes, etc.
   */
  content: string;

  /**
   * Text visible in the image (if any)
   * Empty string if no text detected
   */
  visibleText: string;

  /**
   * Aesthetic patterns and visual themes
   * Examples: geometric patterns, gradients, flat design, photo-realistic, etc.
   */
  aesthetic: string;

  /**
   * Overall summary of the image's visual impression
   */
  summary: string;

  /**
   * Whether the analysis was successful
   * false if vision model was unavailable or analysis failed
   */
  success: boolean;
}

/**
 * Configuration for VisionAnalyzer
 */
export interface VisionAnalyzerConfig {
  /**
   * Custom prompt for image analysis
   * Defaults to persona-focused prompts if not provided
   */
  customPrompt?: string;

  /**
   * Maximum length for each analysis field
   * Prevents excessively long responses
   */
  maxFieldLength?: number;
}

/**
 * VisionAnalyzer extracts persona-relevant information from images
 *
 * Responsibilities:
 * - Analyze image buffers for visual style and content
 * - Extract visible text from images
 * - Identify aesthetic patterns relevant to persona building
 * - Handle vision model unavailability gracefully
 * - Return structured results for persona synthesis
 *
 * @example
 * const analyzer = new VisionAnalyzer(ollamaClient);
 * const result = await analyzer.analyzeImage(imageBuffer);
 * if (result.success) {
 *   console.log('Style:', result.style);
 *   console.log('Content:', result.content);
 * }
 */
export class VisionAnalyzer {
  private ollamaClient: OllamaClient;
  private config: Required<VisionAnalyzerConfig>;

  // Default field length limits to prevent excessive responses
  private readonly DEFAULT_MAX_FIELD_LENGTH = 200;

  constructor(ollamaClient: OllamaClient, config: VisionAnalyzerConfig = {}) {
    this.ollamaClient = ollamaClient;
    this.config = {
      customPrompt: config.customPrompt ?? '',
      maxFieldLength: config.maxFieldLength ?? this.DEFAULT_MAX_FIELD_LENGTH,
    };
  }

  /**
   * Analyze an image buffer for persona extraction
   *
   * @param imageBuffer - Buffer containing image data (PNG, JPEG, etc.)
   * @returns Structured analysis result with style, content, text, and aesthetic info
   */
  async analyzeImage(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
    try {
      // Build the analysis prompt
      const prompt = this.buildAnalysisPrompt();

      // Get analysis from Ollama vision model
      const response = await this.ollamaClient.analyzeImage(imageBuffer, prompt);

      // Check if vision model was unavailable
      if (response.includes('[Image analysis unavailable')) {
        return this.getDefaultResult();
      }

      // Parse the response into structured result
      return this.parseAnalysisResponse(response);
    } catch (error) {
      // Graceful degradation on any error
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Vision analysis failed: ${errorMessage}`);
      return this.getDefaultResult();
    }
  }

  /**
   * Build the image analysis prompt for persona extraction
   *
   * Focuses on aspects relevant to understanding someone's personality
   * and interests through their visual content.
   */
  private buildAnalysisPrompt(): string {
    if (this.config.customPrompt) {
      return this.config.customPrompt;
    }

    return `Analyze this image for persona extraction. Provide the following information:

1. Visual Style: What visual style does this image convey? (e.g., minimalist, colorful, professional, casual, dark, vibrant, monochromatic, retro, futuristic)

2. Content: What content is shown? (e.g., people, products, code screenshots, diagrams, charts, landscapes, architecture, food, art, memes)

3. Visible Text: Is there visible text? If so, what does it say? (transcribe all text you see, if none say "none")

4. Aesthetic Patterns: What aesthetic patterns are present? (e.g., geometric shapes, gradients, flat design, photo-realistic, pixel art, watercolor, brutalist, organic)

5. Summary: Provide a brief 1-2 sentence summary of the overall visual impression and what it suggests about the person who shared this.

Format your response as:
Style: [answer]
Content: [answer]
Visible Text: [answer]
Aesthetic: [answer]
Summary: [answer]`;
  }

  /**
   * Parse the analysis response into structured result
   *
   * @param response - Raw response from vision model
   * @returns Structured ImageAnalysisResult
   */
  private parseAnalysisResponse(response: string): ImageAnalysisResult {
    const lines = response.split('\n').map((line) => line.trim());

    const result: ImageAnalysisResult = {
      style: '',
      content: '',
      visibleText: '',
      aesthetic: '',
      summary: '',
      success: true,
    };

    // Parse each field by label
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Extract field value after the label
      if (lowerLine.startsWith('style:')) {
        result.style = this.extractValue(line, i, lines, ['content', 'visible', 'aesthetic', 'summary']);
      } else if (lowerLine.startsWith('content:')) {
        result.content = this.extractValue(line, i, lines, ['visible', 'aesthetic', 'summary']);
      } else if (lowerLine.startsWith('visible text:') || lowerLine.startsWith('text:')) {
        result.visibleText = this.extractValue(line, i, lines, ['aesthetic', 'summary']);
      } else if (lowerLine.startsWith('aesthetic')) {
        result.aesthetic = this.extractValue(line, i, lines, ['summary']);
      } else if (lowerLine.startsWith('summary:')) {
        result.summary = this.extractValue(line, i, lines, []);
      }
    }

    // If structured parsing failed, try to extract any meaningful content
    if (!result.style && !result.content && response.length > 10) {
      result.summary = this.truncateField(response);
      result.success = true;
    }

    // Ensure we have at least some content
    if (!result.style) {
      result.style = 'unknown';
    }
    if (!result.content) {
      result.content = 'unknown';
    }
    if (!result.aesthetic) {
      result.aesthetic = 'unknown';
    }
    if (!result.summary) {
      result.summary = 'Image analysis completed';
    }

    return result;
  }

  /**
   * Extract value from a line, handling multi-line values
   *
   * @param currentLine - Current line with label
   * @param currentIndex - Index of current line
   * @param allLines - All lines in response
   * @param stopLabels - Labels that indicate end of current field
   * @returns Extracted and truncated value
   */
  private extractValue(currentLine: string, currentIndex: number, allLines: string[], stopLabels: string[]): string {
    // Get value after the first colon
    const colonIndex = currentLine.indexOf(':');
    if (colonIndex === -1) {
      return '';
    }

    let value = currentLine.slice(colonIndex + 1).trim();

    // Check for multi-line values
    for (let i = currentIndex + 1; i < allLines.length; i++) {
      const nextLine = allLines[i];
      const lowerNextLine = nextLine.toLowerCase();

      // Stop if we hit another field label
      if (stopLabels.some((label) => lowerNextLine.startsWith(label))) {
        break;
      }

      // Stop if line looks like a new field (has colon and starts with known word)
      if (lowerNextLine.includes(':') && FIELD_LABEL_REGEX.test(lowerNextLine)) {
        break;
      }

      // Append line to value
      value += ` ${nextLine.trim()}`;
    }

    return this.truncateField(value);
  }

  /**
   * Truncate field value to max length
   *
   * @param value - Value to truncate
   * @returns Truncated value
   */
  private truncateField(value: string): string {
    if (value.length <= this.config.maxFieldLength) {
      return value;
    }
    return `${value.slice(0, this.config.maxFieldLength - 3).trim()}...`;
  }

  /**
   * Get default/empty result when analysis fails
   *
   * @returns Default ImageAnalysisResult with success=false
   */
  private getDefaultResult(): ImageAnalysisResult {
    return {
      style: 'unavailable',
      content: 'unavailable',
      visibleText: '',
      aesthetic: 'unavailable',
      summary: 'Image analysis unavailable - vision model not installed or analysis failed',
      success: false,
    };
  }

  /**
   * Update analyzer configuration
   *
   * @param config - New configuration options
   */
  configure(config: Partial<VisionAnalyzerConfig>): void {
    if (config.customPrompt !== undefined) {
      this.config.customPrompt = config.customPrompt;
    }
    if (config.maxFieldLength !== undefined) {
      this.config.maxFieldLength = config.maxFieldLength;
    }
  }
}
