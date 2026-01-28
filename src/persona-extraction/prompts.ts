/**
 * LLM Prompts for Persona Extraction
 *
 * This module provides prompt builder functions for extracting persona information
 * from various content types using LLM analysis.
 *
 * Each prompt is designed to:
 * - Request structured JSON output for parsing
 * - Focus on persona-relevant signals
 * - Handle edge cases gracefully
 * - Return consistent, typed results
 */

import type { VideoAnalysisResult } from './transcription-analyzer.js';
import type { ImageAnalysisResult } from './vision-analyzer.js';

/**
 * Result from LLM-based text analysis of tweets/posts
 * More detailed than the base TextAnalysisResult in types.ts
 */
export interface LLMTextAnalysisResult {
  /** Overall communication style (e.g., "professional", "casual", "technical", "conversational") */
  communicationStyle: string;
  /** Technical level of content (e.g., "beginner", "intermediate", "advanced", "expert") */
  technicalLevel: string;
  /** Core values expressed through content (e.g., ["innovation", "simplicity", "quality"]) */
  values: string[];
  /** Areas of expertise demonstrated (e.g., ["frontend", "UX design", "performance"]) */
  expertise: string[];
  /** Specific tone markers and patterns (e.g., emojis used, punctuation habits, common phrases) */
  toneMarkers: string[];
  /** Topic clusters the person discusses (e.g., ["React", "Web development", "Design systems"]) */
  topicClusters: string[];
  /** Overall confidence in analysis (0-1) */
  confidence: number;
}

/**
 * Inputs for synthesis prompt combining all analysis types
 */
export interface SynthesisInputs {
  /** Optional text analysis results */
  textAnalysis?: LLMTextAnalysisResult;
  /** Optional image analysis results (multiple images) */
  imageAnalyses?: ImageAnalysisResult[];
  /** Optional video analysis results (multiple videos) */
  videoAnalyses?: VideoAnalysisResult[];
  /** Username of the persona being analyzed */
  username: string;
}

/**
 * Result from synthesis combining all analyses
 */
export interface SynthesisResult {
  /** Structured persona data */
  structured: {
    /** Name/username */
    name: string;
    /** Communication style summary */
    communicationStyle: string;
    /** Technical expertise level */
    technicalLevel: string;
    /** Core values */
    values: string[];
    /** Areas of expertise */
    expertise: string[];
    /** Primary topics discussed */
    topics: string[];
    /** Visual aesthetic preferences (if images analyzed) */
    visualPreferences?: string[];
    /** Presentation style (if videos analyzed) */
    presentationStyle?: string;
  };
  /** Narrative persona description */
  narrative: string;
  /** AI system instructions for persona emulation */
  instructions: string;
}

/**
 * Build prompt for text analysis of tweets/posts
 *
 * Analyzes written content to extract:
 * - Communication style and tone
 * - Technical knowledge level
 * - Core values and beliefs
 * - Expertise areas
 * - Topic interests
 *
 * @param tweets - Array of tweet/post text content
 * @returns Prompt string for LLM analysis
 */
export function buildTextAnalysisPrompt(tweets: string[]): string {
  const tweetCount = tweets.length;
  const sampleText = tweets.slice(0, 20).join('\n\n---\n\n');

  return `You are analyzing social media posts to extract persona information for the purpose of creating an AI persona emulation.

Analyze the following ${tweetCount} posts and extract persona-relevant information.

Posts to analyze:
${sampleText}

${tweetCount > 20 ? `(Note: Showing first 20 of ${tweetCount} posts for context. Analyze all available data.)` : ''}

Provide your analysis as a JSON object with this exact structure:
{
  "communicationStyle": "brief description of their communication style (e.g., professional with casual moments, highly technical, conversational and friendly)",
  "technicalLevel": "assessment of technical expertise (beginner/intermediate/advanced/expert)",
  "values": ["value1", "value2", "value3"],
  "expertise": ["area1", "area2", "area3"],
  "toneMarkers": ["specific pattern1", "specific pattern2"],
  "topicClusters": ["topic1", "topic2", "topic3"],
  "confidence": 0.0-1.0
}

Focus on:
- COMMUNICATION_STYLE: How do they express themselves? Formal? Casual? Technical? Humorous?
- TECHNICAL_LEVEL: What's their depth of technical knowledge? Do they explain basics or dive deep?
- VALUES: What principles matter to them? (quality, simplicity, innovation, learning, etc.)
- EXPERTISE: What domains do they demonstrate knowledge in?
- TONE_MARKERS: Unique patterns (emoji usage, punctuation, catchphrases, habitual expressions)
- TOPIC_CLUSTERS: What subjects do they consistently discuss?
- CONFIDENCE: How confident are you in this analysis? (higher with more data)

Return ONLY the JSON object, no additional text.`;
}

/**
 * Build prompt for image analysis
 *
 * Note: This prompt is documented here for reference but is implemented
 * directly in VisionAnalyzer.buildAnalysisPrompt(). The implementation
 * should match this specification.
 *
 * Analyzes visual content to extract:
 * - Visual style (minimalist, colorful, professional, etc.)
 * - Content types (code, diagrams, people, products, etc.)
 * - Aesthetic patterns
 * - Visible text
 *
 * @param imageContext - Description of image context (currently not used, kept for future)
 * @returns Prompt string for image analysis
 */
export function buildImageAnalysisPrompt(imageContext?: string): string {
  const contextNote = imageContext ? `\nContext: ${imageContext}` : '';

  return `Analyze this image for persona extraction.${contextNote}

Provide the following information:

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
 * Build prompt for video/transcript analysis
 *
 * Note: This prompt is documented here for reference. The speech pattern
 * analysis is implemented algorithmically in TranscriptionAnalyzer, but
 * LLM-based analysis could use this prompt for deeper insights.
 *
 * Analyzes spoken content to extract:
 * - Speaking pace
 * - Filler word usage
 * - Vocabulary complexity
 * - Presentation style
 *
 * @param transcript - Text transcript of video content
 * @returns Prompt string for video analysis
 */
export function buildVideoAnalysisPrompt(transcript: string): string {
  return `You are analyzing a video transcript for persona extraction.

Analyze the following transcript for speech patterns and presentation style.

Transcript:
${transcript}

Provide your analysis as a JSON object with this exact structure:
{
  "pace": "slow|medium|fast",
  "vocabularyComplexity": "basic|intermediate|advanced",
  "fillerWordCount": number,
  "commonFillers": ["filler1", "filler2", "filler3"],
  "averageSentenceLength": number,
  "vocabularyDiversity": 0.0-1.0,
  "presentationStyle": "formal|casual|energetic|calm|technical|storytelling",
  "confidence": 0.0-1.0
}

Focus on:
- PACE: Speaking speed - slow (deliberate), medium (conversational), or fast (energetic)
- VOCABULARY_COMPLEXITY: Basic (simple words), intermediate (mix), or advanced (technical/sophisticated)
- FILLER_WORDS: Count and identify common fillers (um, uh, like, you know, etc.)
- AVERAGE_SENTENCE_LENGTH: Mean words per sentence
- VOCABULARY_DIVERSITY: Unique words / total words ratio (0-1)
- PRESENTATION_STYLE: Formal, casual, energetic, calm, technical, or storytelling
- CONFIDENCE: How confident are you? (higher with longer transcripts)

Return ONLY the JSON object, no additional text.`;
}

/**
 * Build prompt for synthesis of all analyses
 *
 * Combines results from text, image, and video analysis to create:
 * - Structured persona data (typed fields)
 * - Narrative description (readable biography)
 * - AI instructions (for persona emulation in prompts)
 *
 * @param inputs - Combined analysis results from all sources
 * @returns Prompt string for synthesis
 */
export function buildSynthesisPrompt(inputs: SynthesisInputs): string {
  const { textAnalysis, imageAnalyses, videoAnalyses, username } = inputs;

  // Build context sections
  let context = `Analyzing content from @${username} to create a comprehensive persona profile.\n\n`;

  // Text analysis section
  if (textAnalysis) {
    context += `=== TEXT ANALYSIS ===\n`;
    context += `Communication Style: ${textAnalysis.communicationStyle}\n`;
    context += `Technical Level: ${textAnalysis.technicalLevel}\n`;
    context += `Values: ${textAnalysis.values.join(', ')}\n`;
    context += `Expertise: ${textAnalysis.expertise.join(', ')}\n`;
    context += `Tone Markers: ${textAnalysis.toneMarkers.join(', ')}\n`;
    context += `Topic Clusters: ${textAnalysis.topicClusters.join(', ')}\n`;
    context += `Confidence: ${textAnalysis.confidence}\n\n`;
  }

  // Image analysis section
  if (imageAnalyses && imageAnalyses.length > 0) {
    context += `=== IMAGE ANALYSIS (${imageAnalyses.length} images) ===\n`;
    const successfulAnalyses = imageAnalyses.filter((img) => img.success);
    if (successfulAnalyses.length > 0) {
      const styles = successfulAnalyses.map((img) => img.style).filter(Boolean);
      const contents = successfulAnalyses.map((img) => img.content).filter(Boolean);
      const aesthetics = successfulAnalyses.map((img) => img.aesthetic).filter(Boolean);

      if (styles.length > 0) {
        const uniqueStyles = Array.from(new Set(styles));
        context += `Visual Styles: ${uniqueStyles.join(', ')}\n`;
      }
      if (contents.length > 0) {
        const uniqueContents = Array.from(new Set(contents));
        context += `Content Types: ${uniqueContents.join(', ')}\n`;
      }
      if (aesthetics.length > 0) {
        const uniqueAesthetics = Array.from(new Set(aesthetics));
        context += `Aesthetic Patterns: ${uniqueAesthetics.join(', ')}\n`;
      }
    }
    context += '\n';
  }

  // Video analysis section
  if (videoAnalyses && videoAnalyses.length > 0) {
    context += `=== VIDEO ANALYSIS (${videoAnalyses.length} videos) ===\n`;
    const styles = videoAnalyses.map((v) => v.presentationStyle);
    const avgConfidence = videoAnalyses.reduce((sum, v) => sum + v.confidence, 0) / videoAnalyses.length;
    const uniqueStyles = Array.from(new Set(styles));

    context += `Presentation Styles: ${uniqueStyles.join(', ')}\n`;
    context += `Average Confidence: ${avgConfidence.toFixed(2)}\n\n`;
  }

  // Build the synthesis prompt
  return `${context}
=== TASK ===

Create a comprehensive persona profile for @${username} by synthesizing all available analysis data.

Provide your synthesis as a JSON object with this exact structure:
{
  "structured": {
    "name": "username or name",
    "communicationStyle": "2-3 sentence description of how they communicate",
    "technicalLevel": "beginner|intermediate|advanced|expert",
    "values": ["value1", "value2", "value3"],
    "expertise": ["area1", "area2", "area3"],
    "topics": ["topic1", "topic2", "topic3"],
    "visualPreferences": ["pref1", "pref2"],
    "presentationStyle": "formal|casual|energetic|calm|technical|storytelling"
  },
  "narrative": "3-4 paragraph narrative description that reads like a biography or introduction",
  "instructions": "5-7 sentence system instruction for an AI to emulate this persona effectively"
}

GUIDELINES:
- STRUCTURED: Extract key facts into typed fields. Include visualPreferences only if image data exists. Include presentationStyle only if video data exists.
- NARRATIVE: Write in third person, capturing their voice, expertise, values, and what makes them unique. Make it engaging and specific.
- INSTRUCTIONS: Write as a system prompt for an LLM. Include how to communicate, what tone to use, what topics to focus on, and what to avoid. Be specific and actionable.

Return ONLY the JSON object, no additional text.`;
}

/**
 * Build a prompt for refining an existing persona with new data
 *
 * Use this when updating a persona profile with additional content
 * or merging multiple analysis results over time.
 *
 * @param existingPersona - Current synthesis result
 * @param newInputs - New analysis data to incorporate (textAnalysis should be LLMTextAnalysisResult)
 * @returns Prompt string for refinement
 */
export function buildRefinementPrompt(
  existingPersona: SynthesisResult,
  newInputs: Omit<SynthesisInputs, 'username'>,
): string {
  let context = `=== EXISTING PERSONA ===\n`;
  context += JSON.stringify(existingPersona, null, 2);
  context += '\n\n';

  context += `=== NEW DATA TO INCORPORATE ===\n`;

  if (newInputs.textAnalysis) {
    context += `Text Analysis: ${JSON.stringify(newInputs.textAnalysis, null, 2)}\n`;
  }

  if (newInputs.imageAnalyses && newInputs.imageAnalyses.length > 0) {
    context += `New Images: ${newInputs.imageAnalyses.length} items\n`;
  }

  if (newInputs.videoAnalyses && newInputs.videoAnalyses.length > 0) {
    context += `New Videos: ${newInputs.videoAnalyses.length} items\n`;
  }

  return `${context}
=== TASK ===

Update the existing persona profile by incorporating the new analysis data.

Provide the updated synthesis as a JSON object with this exact structure:
{
  "structured": { ... },
  "narrative": "...",
  "instructions": "..."
}

GUIDELINES:
- Merge new insights with existing data
- Update confidence levels based on additional evidence
- Refine the narrative to be more comprehensive
- Update instructions to reflect new patterns discovered
- Maintain consistency with the original persona unless new data strongly suggests a change

Return ONLY the JSON object, no additional text.`;
}
