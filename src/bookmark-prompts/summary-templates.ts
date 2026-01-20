/**
 * Summary length templates
 * Provides 5 length levels with specific guidance for each
 *
 * Based on Summarize's prompt engineering research:
 * https://github.com/anthropics/summarize
 */

/**
 * Summary length levels
 */
export type SummaryLength = 'short' | 'medium' | 'long' | 'xl' | 'xxl';

/**
 * Summary length template
 */
interface LengthTemplate {
  name: SummaryLength;
  description: string;
  targetLength: string;
  structure: string;
  guidance: string;
}

/**
 * Length templates
 */
export const LENGTH_TEMPLATES: Record<SummaryLength, LengthTemplate> = {
  short: {
    name: 'short',
    description: '2-3 sentences, single paragraph',
    targetLength: '2-3 sentences',
    structure: 'Single paragraph',
    guidance: `Provide a concise 2-3 sentence summary that captures the core message.
Focus on the main point and skip supporting details.
Ideal for quick scanning and social media sharing.`,
  },

  medium: {
    name: 'medium',
    description: '2 paragraphs, core claim + supporting evidence',
    targetLength: '2 paragraphs',
    structure: 'Paragraph 1: Core claim\nParagraph 2: Supporting evidence',
    guidance: `Write 2 paragraphs:
- First paragraph: State the core claim or main argument
- Second paragraph: Provide 2-3 key pieces of supporting evidence

Keep each paragraph focused and avoid tangential details.
Good for blog posts and news articles.`,
  },

  long: {
    name: 'long',
    description: '3 paragraphs, ordered by importance',
    targetLength: '3 paragraphs',
    structure: 'Paragraph 1: Most important point\nParagraph 2: Second most important\nParagraph 3: Third most important',
    guidance: `Write 3 paragraphs ordered by importance:
- Paragraph 1: The most critical insight or takeaway
- Paragraph 2: The second most important point
- Paragraph 3: The third most important point or implication

Each paragraph should be substantive but not exhaustive.
Ideal for technical articles and research summaries.`,
  },

  xl: {
    name: 'xl',
    description: '4-6 paragraphs with ### headings',
    targetLength: '4-6 paragraphs',
    structure: 'Multiple sections with ### markdown headings',
    guidance: `Provide a comprehensive summary with 4-6 paragraphs.
Use ### markdown headings to organize each section around a key theme or concept.
Include specific examples, data points, or quotes where relevant.
Structure should follow:
1. ### Core Concept/Overview
2. ### Key Finding 1
3. ### Key Finding 2
4. ### Key Finding 3 (optional)
5. ### Implications (optional)
6. ### Conclusion (optional)

Best for deep dives into technical topics or research papers.`,
  },

  xxl: {
    name: 'xxl',
    description: '6-10 paragraphs with comprehensive coverage',
    targetLength: '6-10 paragraphs',
    structure: 'Comprehensive with ### headings for each major section',
    guidance: `Provide an exhaustive summary with 6-10 paragraphs.
Use ### markdown headings liberally to organize content.
Include all major points, supporting evidence, counterarguments, and nuances.
Structure should cover:
1. ### Overview/Executive Summary
2. ### Background/Context
3. ### Main Arguments (multiple sections)
4. ### Evidence and Examples
5. ### Counterarguments/Limitations
6. ### Implications/Conclusions
7. ### Additional Resources/References (if applicable)

Use this length only for complex or highly technical content where
completeness is more important than brevity.`,
  },
};

/**
 * Get instructions for a specific length level
 */
export function getLengthInstructions(length: SummaryLength): string {
  const template = LENGTH_TEMPLATES[length];
  return `Length: ${template.description}
Target: ${template.targetLength}
Structure: ${template.structure}

Guidance:
${template.guidance}`;
}

/**
 * Get all available length levels
 */
export function getAvailableLengths(): SummaryLength[] {
  return Object.keys(LENGTH_TEMPLATES) as SummaryLength[];
}

/**
 * Validate a length level
 */
export function isValidLength(length: string): length is SummaryLength {
  return length in LENGTH_TEMPLATES;
}
