/**
 * Content type prompts
 * Provides specialized prompts for 7 different content types
 */

/**
 * Content type
 */
export type ContentType =
  | 'article'
  | 'video-transcript'
  | 'github-repo'
  | 'documentation'
  | 'twitter-thread'
  | 'podcast-episode'
  | 'research-paper';

/**
 * Content type definition
 */
interface ContentTypeDefinition {
  name: ContentType;
  displayName: string;
  description: string;
  keyElements: string[];
  specialInstructions: string;
}

/**
 * Content type definitions
 */
export const CONTENT_TYPES: Record<ContentType, ContentTypeDefinition> = {
  article: {
    name: 'article',
    displayName: 'Web Article',
    description: 'General web content including blog posts, news, and essays',
    keyElements: [
      'main argument or thesis',
      'supporting evidence',
      'conclusions or implications',
    ],
    specialInstructions: `Focus on extracting the author's main argument and key supporting points.
Note the publication type (news, opinion, technical blog, etc.) as it affects framing.
If the article presents data or research, mention the key findings.
For opinion pieces, identify the core position and supporting arguments.`,
  },

  'video-transcript': {
    name: 'video-transcript',
    displayName: 'Video Transcript',
    description: 'Spoken content from videos (YouTube, talks, presentations)',
    keyElements: [
      'main topics covered',
      'key insights or quotes',
      'speaker credentials/context',
    ],
    specialInstructions: `Video transcripts often include conversational filler, asides, and audience interaction.
Focus on the substantive content and core messages.
If available, note the speaker's credentials and the context of the talk (conference, tutorial, etc.).
Extract memorable quotes or insights that stand alone well.
For tutorial content, focus on key learnings rather than step-by-step details.`,
  },

  'github-repo': {
    name: 'github-repo',
    displayName: 'GitHub Repository',
    description: 'Code repositories with README, docs, and implementation',
    keyElements: [
      'purpose and problem solved',
      'key features or capabilities',
      'technical approach or architecture',
      'usage patterns',
    ],
    specialInstructions: `For repositories, synthesize the README and documentation.
Focus on:
- What problem does this project solve?
- What are the key features or capabilities?
- What's the technical approach or architecture?
- How mature is the project? (stars, contributors, recent activity)
- What are the dependencies or requirements?

Include specific technical details that help evaluate whether to use this code.
Mention licensing if relevant to usage decisions.`,
  },

  documentation: {
    name: 'documentation',
    displayName: 'Technical Documentation',
    description: 'API docs, technical guides, reference material',
    keyElements: [
      'core concepts or APIs',
      'usage patterns',
      'important parameters or options',
      'common use cases',
    ],
    specialInstructions: `Documentation is often reference material. Organize around:
- What is this documenting? (API, library, system, etc.)
- What are the core concepts or main components?
- What are the most important functions, classes, or endpoints?
- What are common usage patterns or workflows?
- What are gotchas or common mistakes?

Focus on practical understanding rather than comprehensive coverage.
For API docs, highlight the most important endpoints or methods.
Include code examples if they clarify usage.`,
  },

  'twitter-thread': {
    name: 'twitter-thread',
    displayName: 'Twitter Thread',
    description: 'Connected tweets on a single topic',
    keyElements: [
      'main thesis or argument',
      'key supporting points',
      'conclusions or call to action',
    ],
    specialInstructions: `Twitter threads are often argument-driven or explanatory.
Extract the main thesis and supporting arguments.
Note the author's credentials or context if provided (verified, expert, etc.).
For technical threads, focus on the core insights and explanations.
Threads often build progressively - capture the progression and conclusion.
If the thread cites sources or data, mention what was referenced.`,
  },

  'podcast-episode': {
    name: 'podcast-episode',
    displayName: 'Podcast Episode',
    description: 'Audio content with hosts and guests discussing topics',
    keyElements: [
      'main topics discussed',
      'key insights from guests',
      'notable quotes or moments',
    ],
    specialInstructions: `Podcast transcripts include conversational elements, ads, and banter.
Focus on substantive content and key insights.
Note the guests' credentials and the podcast's focus area.
Extract memorable quotes or insights that stand alone well.
For interview-style episodes, capture the guest's main points.
For conversational episodes, identify the key topics discussed and any consensus reached.`,
  },

  'research-paper': {
    name: 'research-paper',
    displayName: 'Research Paper',
    description: 'Academic papers with abstract, methodology, and results',
    keyElements: [
      'research question and hypothesis',
      'methodology overview',
      'key findings',
      'limitations and implications',
    ],
    specialInstructions: `Research papers have a standard structure. Focus on:
- Research question: What problem are they addressing?
- Methodology: How did they study it? (high-level)
- Key findings: What did they discover?
- Significance: Why does this matter?
- Limitations: What are the caveats?

Include quantitative results when available (p-values, effect sizes, improvements).
For papers with code or datasets, mention their availability.
Position the work in context - is this incremental or groundbreaking?
Note the venue (conference, journal) as a quality signal.`,
  },
};

/**
 * Get content type by name
 */
export function getContentType(contentType: ContentType): ContentTypeDefinition {
  return CONTENT_TYPES[contentType];
}

/**
 * Get instructions for a specific content type
 */
export function getContentTypeInstructions(contentType: ContentType): string {
  const def = CONTENT_TYPES[contentType];
  return `Content Type: ${def.displayName}
Description: ${def.description}

Key Elements to Extract:
${def.keyElements.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Special Instructions:
${def.specialInstructions}`;
}

/**
 * Get all available content types
 */
export function getAvailableContentTypes(): ContentType[] {
  return Object.keys(CONTENT_TYPES) as ContentType[];
}

/**
 * Validate a content type
 */
export function isValidContentType(contentType: string): contentType is ContentType {
  return contentType in CONTENT_TYPES;
}

/**
 * Detect content type from URL or metadata
 */
export function detectContentType(options: {
  url?: string;
  title?: string;
  siteName?: string;
}): ContentType {
  const { url, siteName, title } = options;

  // GitHub repositories
  if (url?.includes('github.com/') || url?.includes('gitlab.com/')) {
    return 'github-repo';
  }

  // Documentation sites
  const docSites = ['docs.', 'developer.', 'dev.', 'api.'];
  if (docSites.some(site => url?.includes(site) || siteName?.includes(site))) {
    return 'documentation';
  }

  // Research papers (arXiv, academic sites)
  if (url?.includes('arxiv.org') || url?.includes('acm.org') || url?.includes('ieee.org') || url?.includes('springer.com')) {
    return 'research-paper';
  }

  // Twitter/X
  if (url?.includes('twitter.com') || url?.includes('x.com') || siteName === 'X') {
    return 'twitter-thread';
  }

  // Video platforms
  if (url?.includes('youtube.com') || url?.includes('youtu.be') || url?.includes('vimeo.com')) {
    return 'video-transcript';
  }

  // Podcast platforms
  if (url?.includes('podcast') || url?.includes('spotify.com') || url?.includes('apple.com/podcasts')) {
    return 'podcast-episode';
  }

  // Default to article
  return 'article';
}
