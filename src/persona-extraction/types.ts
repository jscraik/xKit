/**
 * Types for persona extraction from Twitter content
 *
 * Analyzes Twitter profiles, tweets, images, and videos to extract
 * comprehensive persona data for AI system prompts and instructions.
 */

/**
 * Import ImageAnalysisResult from vision-analyzer
 * Imported here for type convenience and documentation
 */
import type { ImageAnalysisResult } from './vision-analyzer.js';

/**
 * Import VideoAnalysisResult from transcription-analyzer
 * Imported here for type convenience and documentation
 */
import type { VideoAnalysisResult } from './transcription-analyzer.js';

/**
 * Main persona extraction result
 * Output from analyzing a Twitter user's content
 */
export interface PersonaResult {
  /**
   * Twitter username (without @)
   */
  username: string;

  /**
   * When the analysis was performed
   */
  analyzedAt: Date;

  /**
   * Extracted persona data
   */
  persona: PersonaData;
}

/**
 * Complete persona data extracted from analysis
 * Contains structured, narrative, and instructional representations
 */
export interface PersonaData {
  /**
   * Structured persona attributes
   * Quantifiable metrics and categorizations
   */
  structured: PersonaStructured;

  /**
   * Narrative description of the persona
   * Natural language summary for human review
   */
  narrative: string;

  /**
   * AI system instructions for persona emulation
   * Directives for AI to adopt this persona
   */
  instructions: string;
}

/**
 * Structured persona attributes
 * Quantifiable metrics and categorizations
 */
export interface PersonaStructured {
  /**
   * Communication style classification
   * Examples: formal, casual, technical, conversational, concise, elaborative
   */
  communicationStyle: string;

  /**
   * Technical expertise level (0-1)
   * 0 = non-technical, 1 = expert-level technical
   */
  technicalLevel: number;

  /**
   * Core values and principles
   * Examples: innovation, simplicity, performance, accessibility, privacy
   */
  values: string[];

  /**
   * Areas of expertise and domain knowledge
   * Examples: frontend architecture, UX design, systems programming, AI/ML
   */
  expertise: string[];

  /**
   * Tone markers and linguistic patterns
   * Examples: direct, humorous, data-driven, opinionated, educational
   */
  toneMarkers: string[];

  /**
   * Topic clusters and recurring themes
   * Examples: web performance, developer tools, open source, design systems
   */
  topicClusters: string[];
}

/**
 * Result from text analysis of tweets
 * Extracted patterns from written content
 */
export interface TextAnalysisResult {
  /**
   * Communication patterns detected
   * Examples: uses analogies, provides code examples, asks questions
   */
  communicationPatterns: string[];

  /**
   * Topics and subject matter
   * Examples: React, CSS, performance, career advice
   */
  topics: string[];

  /**
   * Overall sentiment classification
   * Examples: positive, negative, neutral, enthusiastic, critical
   */
  sentiment: string;

  /**
   * Vocabulary complexity level
   * Examples: basic, intermediate, advanced, expert
   */
  vocabularyLevel: string;
}

/**
 * Re-export image and video analysis types
 * These are defined in their respective analyzer modules
 */
export type { ImageAnalysisResult, VideoAnalysisResult };

/**
 * Configuration options for persona analysis
 */
export interface PersonaAnalysisOptions {
  /**
   * Include image analysis in persona extraction
   * @default true
   */
  includeImages?: boolean;

  /**
   * Include video analysis in persona extraction
   * @default true
   */
  includeVideos?: boolean;

  /**
   * Maximum number of tweets to analyze
   * @default 100
   */
  maxTweets?: number;

  /**
   * Minimum confidence threshold for including patterns
   * @default 0.5
   */
  minConfidence?: number;

  /**
   * Custom focus areas for analysis
   * Override automatic topic detection
   */
  focusAreas?: string[];
}
