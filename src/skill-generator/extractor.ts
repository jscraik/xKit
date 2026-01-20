/**
 * Skill extractor
 * Analyzes bookmarked content for reusable patterns and best practices
 */

import { createHash, randomUUID } from 'node:crypto';
import { OllamaClient } from '../bookmark-enrichment/ollama-client.js';
import { buildTaggedPrompt } from '../bookmark-prompts/tagged-prompts.js';
import { escapeXmlTags } from '../security/sanitizer.js';
import type { Persona } from '../bookmark-prompts/personas.js';
import type { ContentType } from '../bookmark-prompts/content-types.js';
import type { LinkedContent } from '../bookmark-enrichment/types.js';
import type { EnrichedBookmark } from '../bookmark-enrichment/types.js';
import type {
  ExtractionResult,
  SkillCandidate,
  SkillCategory,
  SkillExtractionOptions,
} from './types.js';

/**
 * Skill extractor
 */
export class SkillExtractor {
  private category: SkillCategory | undefined;
  private minConfidence: number;
  private maxSkills: number;
  private llm: OllamaClient;

  constructor(options: SkillExtractionOptions = {}) {
    this.category = options.category;
    this.minConfidence = options.minConfidence ?? 0.5;
    this.maxSkills = options.maxSkills ?? 10;
    this.llm = new OllamaClient();
  }

  /**
   * Extract skills from a single bookmark
   */
  async extractFromBookmark(
    bookmark: EnrichedBookmark
  ): Promise<SkillCandidate[]> {
    const skills: SkillCandidate[] = [];

    // Only process bookmarks with linked content
    if (!bookmark.linkedContent || bookmark.linkedContent.length === 0) {
      return skills;
    }

    // Extract skills from each linked content
    for (const content of bookmark.linkedContent) {
      const extracted = await this.extractFromContent(content, bookmark);
      skills.push(...extracted);
    }

    // Filter by confidence and limit
    return skills
      .filter((skill) => skill.confidence >= this.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.maxSkills);
  }

  /**
   * Extract skills from linked content
   */
  async extractFromContent(
    content: LinkedContent,
    bookmark?: EnrichedBookmark
  ): Promise<SkillCandidate[]> {
    const skills: SkillCandidate[] = [];

    // Determine content type for tailored extraction
    const contentType = this.detectContentType(content);

    // Extract based on content type
    switch (contentType) {
      case 'github':
        const githubSkills = await this.extractFromGitHub(content, bookmark);
        skills.push(...githubSkills);
        break;

      case 'article':
        const articleSkills = await this.extractFromArticle(content, bookmark);
        skills.push(...articleSkills);
        break;

      default:
        // Generic extraction for other types
        const genericSkills = await this.extractFromGeneric(content, bookmark);
        skills.push(...genericSkills);
        break;
    }

    return skills;
  }

  /**
   * Extract skills from GitHub repository
   */
  private async extractFromGitHub(content: LinkedContent, bookmark?: EnrichedBookmark): Promise<SkillCandidate[]> {
    // Check if this is a GitHub repo with useful content
    if (content.type !== 'github' || !content.readme) {
      return [];
    }

    // Analyze the README for code patterns and best practices
    const skills = await this.analyzeForCodePatterns(content, bookmark);
    return skills;
  }

  /**
   * Extract skills from articles
   */
  private async extractFromArticle(content: LinkedContent, bookmark?: EnrichedBookmark): Promise<SkillCandidate[]> {
    if (content.type !== 'article' || !content.textContent) {
      return [];
    }

    // Analyze for best practices and workflows
    const skills = await this.analyzeForBestPractices(content, bookmark);
    return skills;
  }

  /**
   * Extract skills from generic content
   */
  private async extractFromGeneric(content: LinkedContent, bookmark?: EnrichedBookmark): Promise<SkillCandidate[]> {
    if (!content.textContent && !content.description) {
      return [];
    }

    const textContent = content.textContent || content.description || '';
    const skills = await this.analyzeGenericContent(textContent, content, bookmark);
    return skills;
  }

  /**
   * Analyze content for code patterns
   */
  private async analyzeForCodePatterns(content: LinkedContent, bookmark?: EnrichedBookmark): Promise<SkillCandidate[]> {
    if (!content.readme) {
      return [];
    }

    const safeReadme = escapeXmlTags(content.readme);
    const prompt = this.buildCodePatternPrompt(safeReadme, content, bookmark);

    try {
      const response = await this.llm['client'].generate({
        model: this.llm['config'].model,
        prompt,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9 },
      });

      return this.parseSkillExtraction(response.response, content, 'code-pattern', bookmark);
    } catch {
      return [];
    }
  }

  /**
   * Analyze content for best practices
   */
  private async analyzeForBestPractices(content: LinkedContent, bookmark?: EnrichedBookmark): Promise<SkillCandidate[]> {
    const textContent = content.textContent || '';
    if (!textContent) {
      return [];
    }

    const safeContent = escapeXmlTags(textContent);
    const prompt = this.buildBestPracticePrompt(safeContent, content, bookmark);

    try {
      const response = await this.llm['client'].generate({
        model: this.llm['config'].model,
        prompt,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9 },
      });

      return this.parseSkillExtraction(response.response, content, 'best-practice', bookmark);
    } catch {
      return [];
    }
  }

  /**
   * Analyze generic content
   */
  private async analyzeGenericContent(
    text: string,
    content: LinkedContent,
    bookmark?: EnrichedBookmark
  ): Promise<SkillCandidate[]> {
    const safeContent = escapeXmlTags(text);
    const prompt = this.buildGenericSkillPrompt(safeContent, content, bookmark);

    try {
      const response = await this.llm['client'].generate({
        model: this.llm['config'].model,
        prompt,
        stream: false,
        options: { temperature: 0.3, top_p: 0.9 },
      });

      return this.parseSkillExtraction(response.response, content, 'best-practice', bookmark);
    } catch {
      return [];
    }
  }

  /**
   * Build prompt for code pattern extraction
   */
  private buildCodePatternPrompt(readme: string, content: LinkedContent, bookmark?: EnrichedBookmark): string {
    const metadata = this.buildMetadata(content, bookmark);

    return buildTaggedPrompt({
      instructions: `You are an expert at identifying reusable code patterns and best practices from software documentation.

Your task is to analyze this GitHub README and extract 1-3 reusable skills that developers could use when working with similar technologies.

For each skill, provide:
1. **name**: A clear, action-oriented skill name (e.g., "Implement Type-Safe API Validation")
2. **description**: One sentence explaining what the skill teaches
3. **confidence**: A number from 0.0 to 1.0 indicating how confident you are this is a reusable pattern
4. **instructions**: Step-by-step implementation guidance
5. **examples**: 1-2 concrete code examples (as markdown code blocks)
6. **edgeCases**: Common pitfalls or edge cases to watch for

Only extract patterns that are:
- Generic enough to be reusable across projects
- Specific enough to be actionable
- Well-documented in the content

Return your response as valid JSON array:
\`\`\`json
[
  {
    "name": "...",
    "description": "...",
    "confidence": 0.8,
    "instructions": "Step 1: ...\nStep 2: ...",
    "examples": ["Example code..."],
    "edgeCases": ["Watch out for..."]
  }
]
\`\`\``,
      context: metadata,
      content: readme,
    });
  }

  /**
   * Build prompt for best practice extraction
   */
  private buildBestPracticePrompt(article: string, content: LinkedContent, bookmark?: EnrichedBookmark): string {
    const metadata = this.buildMetadata(content, bookmark);

    return buildTaggedPrompt({
      instructions: `You are an expert at identifying engineering best practices and workflows from technical articles.

Your task is to analyze this article and extract 1-3 reusable skills that developers could apply to their work.

For each skill, provide:
1. **name**: A clear, action-oriented skill name
2. **description**: One sentence explaining what the skill teaches
3. **confidence**: A number from 0.0 to 1.0 indicating how confident you are this is a valuable practice
4. **instructions**: Step-by-step guidance for applying this practice
5. **examples**: 1-2 concrete examples or scenarios
6. **edgeCases**: Common pitfalls or situations where this practice may not apply

Only extract practices that are:
- Actionable and specific
- Supported by evidence in the article
- Applicable across different contexts

Return your response as valid JSON array:
\`\`\`json
[
  {
    "name": "...",
    "description": "...",
    "confidence": 0.8,
    "instructions": "Step 1: ...\nStep 2: ...",
    "examples": ["Example scenario..."],
    "edgeCases": ["When this doesn't apply..."]
  }
]
\`\`\``,
      context: metadata,
      content: article,
    });
  }

  /**
   * Build prompt for generic skill extraction
   */
  private buildGenericSkillPrompt(text: string, content: LinkedContent, bookmark?: EnrichedBookmark): string {
    const metadata = this.buildMetadata(content, bookmark);

    return buildTaggedPrompt({
      instructions: `You are an expert at identifying valuable knowledge and skills from technical content.

Your task is to analyze this content and extract 1-2 reusable skills that could be useful for developers.

For each skill, provide:
1. **name**: A clear, descriptive skill name
2. **description**: One sentence explaining what the skill teaches
3. **confidence**: A number from 0.0 to 1.0 indicating how confident you are this is a valuable skill
4. **instructions**: Clear guidance for applying this skill
5. **examples**: Concrete examples if applicable
6. **edgeCases**: Limitations or things to watch for

Only extract skills that are:
- Actionable and practical
- Clearly supported by the content
- Generally applicable

If the content doesn't contain clear reusable skills, return an empty array.

Return your response as valid JSON array:
\`\`\`json
[
  {
    "name": "...",
    "description": "...",
    "confidence": 0.7,
    "instructions": "...",
    "examples": ["..."],
    "edgeCases": ["..."]
  }
]
\`\`\``,
      context: metadata,
      content: text,
    });
  }

  /**
   * Parse LLM response into SkillCandidate objects
   */
  private parseSkillExtraction(
    response: string,
    content: LinkedContent,
    defaultCategory: SkillCategory,
    bookmark?: EnrichedBookmark
  ): SkillCandidate[] {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;

      const extracted = JSON.parse(jsonText.trim());
      const skills = Array.isArray(extracted) ? extracted : [extracted];

      // Get URL from bookmark (LinkedContent doesn't have url property)
      const url = bookmark?.url || bookmark?.expandedUrls?.[0]?.finalUrl || '';

      return skills.map((skill) => ({
        id: randomUUID(),
        name: skill.name || 'Untitled Skill',
        description: skill.description || '',
        category: this.category ?? defaultCategory,
        confidence: typeof skill.confidence === 'number' ? skill.confidence : 0.5,
        source: {
          url: url,
          title: content.title || bookmark?.text || '',
          type: content.type,
        },
        content: {
          instructions: skill.instructions || '',
          implementation: skill.instructions || '',
          examples: Array.isArray(skill.examples) ? skill.examples : [],
          edgeCases: Array.isArray(skill.edgeCases) ? skill.edgeCases : [],
        },
      }));
    } catch {
      // If JSON parsing fails, return empty array
      return [];
    }
  }

  /**
   * Build metadata context for prompts
   */
  private buildMetadata(content: LinkedContent, bookmark?: EnrichedBookmark): string {
    const parts: string[] = [];

    if (content.title) {
      parts.push(`Title: ${content.title}`);
    }

    // Get URL from bookmark (LinkedContent doesn't have url property)
    const url = bookmark?.url || bookmark?.expandedUrls?.[0]?.finalUrl;
    if (url) {
      parts.push(`URL: ${url}`);
    }

    if (content.type) {
      parts.push(`Type: ${content.type}`);
    }

    if (content.siteName) {
      parts.push(`Site: ${content.siteName}`);
    }

    return parts.join('\n');
  }

  /**
   * Detect content type from LinkedContent
   */
  private detectContentType(content: LinkedContent): string {
    return content.type;
  }

  /**
   * Extract skills from multiple bookmarks
   */
  async extractFromBookmarks(bookmarks: EnrichedBookmark[]): Promise<SkillCandidate[]> {
    const skills: SkillCandidate[] = [];

    for (const bookmark of bookmarks) {
      const extracted = await this.extractFromBookmark(bookmark);
      skills.push(...extracted);
    }

    // Deduplicate by content hash
    const uniqueSkills = this.deduplicateSkills(skills);

    // Filter by confidence and limit
    return uniqueSkills
      .filter((skill) => skill.confidence >= this.minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.maxSkills);
  }

  /**
   * Deduplicate skills by content
   */
  private deduplicateSkills(skills: SkillCandidate[]): SkillCandidate[] {
    const seen = new Map<string, SkillCandidate>();

    for (const skill of skills) {
      const key = this.skillKey(skill);
      if (!seen.has(key)) {
        seen.set(key, skill);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate unique key for skill
   */
  private skillKey(skill: SkillCandidate): string {
    const key = `${skill.category}:${skill.name}:${skill.description}`;
    return createHash('sha256').update(key).digest('hex').slice(0, 16);
  }
}
