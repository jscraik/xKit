/**
 * Enhanced summarization prompts for xKit
 * Provides tagged prompts, length templates, personas, and content types
 *
 * This module implements Phase 1B of the AI Knowledge Transformation System.
 *
 * Key Features:
 * - Tagged prompt structure (ADR-001)
 * - 5 length levels (short, medium, long, xl, xxl)
 * - 7 personas for different contexts
 * - 7 content-type specific prompts
 * - Custom template support
 *
 * @example
 * ```typescript
 * import { buildEnhancedPrompt } from './prompts.js';
 *
 * const prompt = buildEnhancedPrompt({
 *   content: articleContent,
 *   url: 'https://example.com/article',
 *   title: 'Understanding TypeScript',
 *   persona: 'curious-learner',
 *   length: 'medium',
 *   contentType: 'article',
 * });
 * ```
 */

// Re-export all prompt functionality
export * from './tagged-prompts.js';
export * from './summary-templates.js';
export * from './personas.js';
export * from './content-types.js';

import { buildTaggedPrompt, buildExtendedTaggedPrompt } from './tagged-prompts.js';
import { getLengthInstructions, type SummaryLength } from './summary-templates.js';
import { getPersonaInstructions, type Persona } from './personas.js';
import { getContentTypeInstructions, detectContentType, type ContentType } from './content-types.js';

/**
 * Enhanced prompt options
 */
export interface EnhancedPromptOptions {
  // Required
  content: string;
  url: string;
  title: string;

  // Optional (with defaults)
  persona?: Persona;
  length?: SummaryLength;
  contentType?: ContentType;
  language?: string;
  siteName?: string;

  // Advanced
  customInstructions?: string;
  maxTokens?: number;
}

/**
 * Build an enhanced summarization prompt
 *
 * This function combines tagged prompts with length, persona, and content-type
 * specific guidance to create a comprehensive summarization prompt.
 *
 * @param options - Prompt configuration options
 * @returns Formatted prompt ready for LLM
 *
 * @example
 * const prompt = buildEnhancedPrompt({
 *   content: 'TypeScript generics allow you to create reusable components...',
 *   url: 'https://example.com/ts-generics',
 *   title: 'Understanding TypeScript Generics',
 *   persona: 'curious-learner',
 *   length: 'medium',
 *   contentType: 'article',
 * });
 */
export function buildEnhancedPrompt(options: EnhancedPromptOptions): string {
  const {
    content,
    url,
    title,
    persona = 'curious-learner',
    length = 'medium',
    contentType,
    language = 'English',
    siteName,
    customInstructions,
    maxTokens,
  } = options;

  // Detect content type if not provided
  const detectedType = contentType ?? detectContentType({ url, siteName });

  // Build instructions section
  const instructions = buildInstructions({
    persona,
    length,
    contentType: detectedType,
    customInstructions,
  });

  // Build context section
  const context = buildContext({
    url,
    title,
    siteName,
    language,
    maxTokens,
  });

  // Build tagged prompt with security (XML escaping)
  return buildExtendedTaggedPrompt({
    instructions,
    context,
    content,
    metadata: {
      language,
      format: 'markdown',
    },
  });
}

/**
 * Build instructions section
 */
function buildInstructions(options: {
  persona: Persona;
  length: SummaryLength;
  contentType: ContentType;
  customInstructions?: string;
}): string {
  const { persona, length, contentType, customInstructions } = options;

  const parts = [
    `# Task`,
    'Summarize the content according to the specified requirements.',
    '',
    `# Persona`,
    getPersonaInstructions(persona),
    '',
    `# Length Requirements`,
    getLengthInstructions(length),
    '',
    `# Content Type Guidance`,
    getContentTypeInstructions(contentType),
  ];

  if (customInstructions) {
    parts.push('', `# Custom Instructions`, customInstructions);
  }

  return parts.join('\n');
}

/**
 * Build context section
 */
function buildContext(options: {
  url: string;
  title: string;
  siteName?: string;
  language?: string;
  maxTokens?: number;
}): string {
  const { url, title, siteName, language, maxTokens } = options;

  const parts = [
    `URL: ${url}`,
    `Title: ${title}`,
  ];

  if (siteName) {
    parts.push(`Source: ${siteName}`);
  }

  if (language) {
    parts.push(`Language: ${language}`);
  }

  if (maxTokens) {
    parts.push(`Max Tokens: ${maxTokens}`);
  }

  return parts.join('\n');
}

/**
 * Get default persona for content type
 */
export function getDefaultPersona(contentType: ContentType): Persona {
  const defaults: Record<ContentType, Persona> = {
    'article': 'curious-learner',
    'video-transcript': 'educator',
    'github-repo': 'engineer-pragmatic',
    'documentation': 'engineer-pragmatic',
    'twitter-thread': 'synthesizer',
    'podcast-episode': 'curious-learner',
    'research-paper': 'technical-researcher',
  };

  return defaults[contentType] ?? 'curious-learner';
}
