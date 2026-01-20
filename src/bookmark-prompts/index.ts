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
export * from './custom-templates.js';

import { buildTaggedPrompt, buildExtendedTaggedPrompt } from './tagged-prompts.js';
import { getLengthInstructions, type SummaryLength } from './summary-templates.js';
import { getPersonaInstructions, type Persona } from './personas.js';
import { getContentTypeInstructions, detectContentType, type ContentType } from './content-types.js';
import { CustomTemplateManager, TemplateNotFoundError } from './custom-templates.js';

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

  // Custom template support (Phase 4)
  /** Template name (loads from ~/.xkit/templates/<name>.md) */
  template?: string;
  /** Variable substitutions for template (key=value pairs) */
  templateVars?: Record<string, string>;
}

/**
 * Build an enhanced summarization prompt
 *
 * This function combines tagged prompts with length, persona, and content-type
 * specific guidance to create a comprehensive summarization prompt.
 *
 * With custom templates (Phase 4):
 * - Template takes precedence over persona (CRITICAL-1)
 * - Template content provides customInstructions
 * - Persona is only used if no template is specified
 *
 * @param options - Prompt configuration options
 * @returns Formatted prompt ready for LLM
 *
 * @example
 * // Built-in persona/length (existing)
 * const prompt = buildEnhancedPrompt({
 *   content: 'TypeScript generics allow you to create reusable components...',
 *   url: 'https://example.com/ts-generics',
 *   title: 'Understanding TypeScript Generics',
 *   persona: 'curious-learner',
 *   length: 'medium',
 *   contentType: 'article',
 * });
 *
 * @example
 * // Custom template (Phase 4)
 * const prompt = buildEnhancedPrompt({
 *   content: 'This research paper presents a novel approach...',
 *   url: 'https://arxiv.org/abs/1234.5678',
 *   title: 'Novel Approach to X',
 *   template: 'research-paper',
 *   templateVars: { domain: 'ML', focus: 'optimization' },
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
    template,
    templateVars,
  } = options;

  // Detect content type if not provided
  const detectedType = contentType ?? detectContentType({ url, siteName });

  // CRITICAL-1: Template takes precedence over persona
  // Handle custom template if specified
  let resolvedCustomInstructions = customInstructions;
  let resolvedPersona = persona;

  if (template) {
    const manager = new CustomTemplateManager();
    const templateData = manager.loadTemplate(template);

    if (!templateData) {
      // CRITICAL-4: Graceful degradation with helpful error
      throw new TemplateNotFoundError(
        `Template not found: ${template}\n\n` +
          `Available templates:\n${manager.listTemplates().map(t => `  - ${t.frontmatter.name}: ${t.frontmatter.description}`).join('\n') || '  (none)'}\n\n` +
          `Or use --persona instead:\n` +
          `  xkit archive --summarize --persona technical-researcher`
      );
    }

    // Validate template for security
    const validation = manager.validateTemplate(templateData.content);
    if (!validation.valid) {
      throw new Error(
        `Template validation failed: ${template}\n\n` +
          validation.errors.join('\n')
      );
    }

    // Merge default variables with provided vars (provided vars take precedence)
    const mergedVars = {
      ...templateData.frontmatter.variables,
      ...templateVars,
    };

    // Substitute variables (throws on undefined vars - strict mode)
    resolvedCustomInstructions = manager.substituteVariables(
      templateData.content,
      mergedVars
    );

    // Skip persona processing when template is used
    // The template provides full custom instructions
    resolvedPersona = undefined as any; // Override persona
  }

  // Build instructions section
  const instructions = buildInstructions({
    persona: resolvedPersona,
    length,
    contentType: detectedType,
    customInstructions: resolvedCustomInstructions,
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
 *
 * When persona is undefined (template mode), skips the Persona section
 * and uses only custom instructions from the template.
 */
function buildInstructions(options: {
  persona?: Persona;
  length?: SummaryLength;
  contentType?: ContentType;
  customInstructions?: string;
}): string {
  const { persona, length, contentType, customInstructions } = options;

  // When using template (no persona), build minimal instructions
  if (!persona) {
    // Template mode: Use custom instructions as primary guidance
    if (customInstructions) {
      return `# Task\n${customInstructions}`;
    }
    // Fallback if somehow no customInstructions either
    return `# Task\nSummarize the content.`;
  }

  // Standard mode: Build full instructions with persona, length, content type
  const parts = [
    `# Task`,
    'Summarize the content according to the specified requirements.',
    '',
    `# Persona`,
    getPersonaInstructions(persona),
    '',
    `# Length Requirements`,
    getLengthInstructions(length || 'medium'),
    '',
    `# Content Type Guidance`,
    getContentTypeInstructions(contentType || 'article'),
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
