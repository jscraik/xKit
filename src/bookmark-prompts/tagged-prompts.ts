/**
 * Tagged prompt structure for LLM interactions
 * Based on ADR-001 and Summarize's proven three-part prompt structure
 *
 * Architecture Decision Record (ADR-001):
 * https://github.com/anthropics/summarize/blob/main/docs/architecture/adr-001-tagged-prompts.md
 *
 * Key Benefits:
 * 1. Clear separation of instructions, context, and content
 * 2. Prevents prompt injection via XML tag escaping (see src/security/sanitizer.ts)
 * 3. Consistent structure across all LLM interactions
 * 4. Easy to extend with additional sections
 */

/**
 * Build a tagged prompt for LLM interaction
 *
 * @param options - Instructions, context, and content
 * @returns Formatted tagged prompt
 *
 * @example
 * const prompt = buildTaggedPrompt({
 *   instructions: 'Summarize this article in 2-3 sentences',
 *   context: 'Title: Understanding TypeScript Generics',
 *   content: 'TypeScript generics allow you to...'
 * });
 *
 * // Output:
 * // <instructions>
 * // Summarize this article in 2-3 sentences
 * // </instructions>
 * //
 * // <context>
 * // Title: Understanding TypeScript Generics
 * // </context>
 * //
 * // <content>
 * // TypeScript generics allow you to...
 * // </content>
 */
export function buildTaggedPrompt(options: {
  instructions: string;
  context: string;
  content: string;
}): string {
  const { instructions, context, content } = options;

  // Build each section with trimmed content
  const instructionsSection = instructions.trim();
  const contextSection = context.trim();
  const contentSection = content.trim();

  return `<instructions>
${instructionsSection}
</instructions>

<context>
${contextSection}
</context>

<content>
${contentSection}
</content>`;
}

/**
 * Build a tagged prompt with additional metadata
 *
 * Use this when you need to include additional context like:
 * - Language preference
 * - Output format requirements
 * - Tone/style guidance
 *
 * @param options - Full prompt configuration
 * @returns Formatted tagged prompt with metadata
 */
export function buildExtendedTaggedPrompt(options: {
  instructions: string;
  context: string;
  content: string;
  metadata?: {
    language?: string;
    format?: string;
    tone?: string;
  };
}): string {
  const { instructions, context, content, metadata } = options;

  let prompt = buildTaggedPrompt({ instructions, context, content });

  // Add metadata section if provided
  if (metadata && Object.keys(metadata).length > 0) {
    const metadataLines = Object.entries(metadata)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`);

    if (metadataLines.length > 0) {
      prompt += `\n\n<metadata>\n${metadataLines.join('\n')}\n</metadata>`;
    }
  }

  return prompt;
}
