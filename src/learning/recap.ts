/**
 * Recap system
 * Generates periodic recaps from bookmark collections with semantic clustering
 */

import { randomUUID } from 'node:crypto';
import { OllamaClient } from '../bookmark-enrichment/ollama-client.js';
import { buildTaggedPrompt } from '../bookmark-prompts/tagged-prompts.js';
import type { EnrichedBookmark } from '../bookmark-enrichment/types.js';
import type { Recap, RecapPeriod, RecapOptions, ThemeCluster, TopicConnection } from './types.js';

/**
 * Recap system
 */
export class RecapSystem {
  private llm: OllamaClient;

  constructor() {
    this.llm = new OllamaClient();
  }

  /**
   * Generate recap from bookmarks
   */
  async generateRecap(
    bookmarks: EnrichedBookmark[],
    options: RecapOptions
  ): Promise<Recap> {
    // Filter bookmarks by categories if specified
    let filteredBookmarks = bookmarks;
    if (options.categories && options.categories.length > 0) {
      filteredBookmarks = bookmarks.filter((b) => {
        const tags = b.tags || [];
        return options.categories!.some((cat) => tags.includes(cat));
      });
    }

    // Extract content for clustering
    const bookmarkContent = this.extractContentSummaries(filteredBookmarks);

    // Generate themes using LLM
    const themes = await this.generateThemes(bookmarkContent);

    // Generate connections
    const connections = await this.generateConnections(themes);

    // Generate next steps
    const nextSteps = await this.generateNextSteps(themes, options.period);

    // Generate reflection questions
    const reflectionQuestions = await this.generateReflectionQuestions(themes, options.period);

    return {
      id: randomUUID(),
      period: options.period,
      generatedAt: new Date().toISOString(),
      bookmarks: {
        total: bookmarks.length,
        processed: filteredBookmarks.length,
      },
      themes,
      connections,
      nextSteps,
      reflectionQuestions,
    };
  }

  /**
   * Extract content summaries from bookmarks
   */
  private extractContentSummaries(bookmarks: EnrichedBookmark[]): Array<{
    url: string;
    title: string;
    summary: string;
    tags: string[];
  }> {
    return bookmarks
      .filter((b) => b.linkedContent && b.linkedContent.length > 0)
      .map((b) => {
        const content = b.linkedContent![0];
        return {
          url: b.url,
          title: content.title || b.text || '',
          summary: content.summary || content.description || content.textContent?.substring(0, 500) || '',
          tags: b.tags || [],
        };
      });
  }

  /**
   * Generate thematic clusters from bookmarks
   */
  private async generateThemes(
    bookmarks: Array<{ url: string; title: string; summary: string; tags: string[] }>
  ): Promise<ThemeCluster[]> {
    // Create a condensed summary of all bookmarks
    const bookmarkList = bookmarks
      .map((b, i) => `${i + 1}. "${b.title}"\n   ${b.summary.substring(0, 200)}...`)
      .join('\n\n');

    const prompt = buildTaggedPrompt({
      instructions: `You are an expert at identifying patterns and themes in technical content.

Your task is to analyze these bookmarked articles and group them into 3-5 thematic clusters.

For each theme:
1. **Theme name**: A concise, descriptive theme name (3-5 words)
2. **Description**: What this theme represents
3. **Bookmarks**: List of bookmark indices that belong to this theme with relevance scores (0-1)
4. **Key insights**: 3-5 key takeaways from this cluster

Return your response as valid JSON:
\`\`\`json
{
  "themes": [
    {
      "name": "Theme Name",
      "description": "What this theme covers...",
      "bookmarks": [
        {"index": 1, "relevance": 0.95},
        {"index": 5, "relevance": 0.85}
      ],
      "keyInsights": [
        "Key insight 1",
        "Key insight 2"
      ]
    }
  ]
}
\`\`\``,
      context: `Bookmarks: ${bookmarks.length} articles to analyze`,
      content: bookmarkList,
    });

    const response = await this.llm['client'].generate({
      model: this.llm['config'].model,
      prompt,
      stream: false,
      options: { temperature: 0.3, top_p: 0.9 },
    });

    return this.parseThemes(response.response, bookmarks);
  }

  /**
   * Generate connections between themes
   */
  private async generateConnections(themes: ThemeCluster[]): Promise<TopicConnection[]> {
    if (themes.length < 2) return [];

    const themeList = themes.map((t, i) => `${i + 1}. ${t.theme}`).join('\n');
    const insightsList = themes.map((t, i) => `${i + 1}. ${t.theme}:\n${t.keyInsights.join('\n')}`).join('\n\n');

    const prompt = buildTaggedPrompt({
      instructions: `You are an expert at identifying connections and relationships between technical topics.

Your task is to analyze these themes and identify 3-5 interesting connections between them.

For each connection:
1. **From**: Source theme (by number)
2. **To**: Target theme (by number)
3. **Connection**: How they relate or build on each other
4. **Strength**: How strong the connection is (0-1)

Return your response as valid JSON:
\`\`\`json
{
  "connections": [
    {
      "from": 1,
      "to": 2,
      "connection": "How theme 1 relates to theme 2...",
      "strength": 0.8
    }
  ]
}
\`\`\``,
      context: `Themes:\n${themeList}`,
      content: `Key Insights:\n${insightsList}`,
    });

    const response = await this.llm['client'].generate({
      model: this.llm['config'].model,
      prompt,
      stream: false,
      options: { temperature: 0.3, top_p: 0.9 },
    });

    return this.parseConnections(response.response, themes);
  }

  /**
   * Generate next steps based on themes
   */
  private async generateNextSteps(themes: ThemeCluster[], period: RecapPeriod): Promise<string[]> {
    const themeSummary = themes.map((t) => `- ${t.theme}: ${t.description}`).join('\n');

    const prompt = buildTaggedPrompt({
      instructions: `You are an expert learning strategist helping developers continue their learning journey.

Based on these themes from the past ${period}, suggest 3-5 actionable next steps for deeper learning.

Next steps should be:
- Specific and actionable
- Aligned with the themes identified
- Progressive (building on current knowledge)
- Include a mix of practical and theoretical suggestions

Return your response as valid JSON:
\`\`\`json
{
  "nextSteps": [
    "Specific actionable next step 1",
    "Specific actionable next step 2"
  ]
}
\`\`\``,
      context: `Period: ${period}`,
      content: `Themes:\n${themeSummary}`,
    });

    const response = await this.llm['client'].generate({
      model: this.llm['config'].model,
      prompt,
      stream: false,
      options: { temperature: 0.4, top_p: 0.9 },
    });

    try {
      const jsonMatch = response.response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response.response;
      const parsed = JSON.parse(jsonText.trim());
      return parsed.nextSteps || [];
    } catch {
      return [];
    }
  }

  /**
   * Generate reflection questions
   */
  private async generateReflectionQuestions(themes: ThemeCluster[], period: RecapPeriod): Promise<string[]> {
    const themeSummary = themes.map((t) => `- ${t.theme}: ${t.description}`).join('\n');

    const prompt = buildTaggedPrompt({
      instructions: `You are an expert learning strategist helping developers reflect on their learning.

Based on these themes from the past ${period}, generate 3-5 thought-provoking reflection questions.

Reflection questions should:
- Encourage deeper thinking about the topics
- Connect different concepts
- Prompt self-assessment of understanding
- Suggest areas for further exploration

Return your response as valid JSON:
\`\`\`json
{
  "questions": [
    "Reflection question 1",
    "Reflection question 2"
  ]
}
\`\`\``,
      context: `Period: ${period}`,
      content: `Themes:\n${themeSummary}`,
    });

    const response = await this.llm['client'].generate({
      model: this.llm['config'].model,
      prompt,
      stream: false,
      options: { temperature: 0.4, top_p: 0.9 },
    });

    try {
      const jsonMatch = response.response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response.response;
      const parsed = JSON.parse(jsonText.trim());
      return parsed.questions || [];
    } catch {
      return [];
    }
  }

  /**
   * Parse themes from LLM response
   */
  private parseThemes(
    response: string,
    bookmarks: Array<{ url: string; title: string; summary: string; tags: string[] }>
  ): ThemeCluster[] {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonText.trim());

      return (parsed.themes || []).map((t: any) => ({
        theme: t.theme || 'Untitled Theme',
        description: t.description || '',
        bookmarks: (t.bookmarks || []).map((b: any) => {
          const bookmarkIndex = (b.index || 1) - 1;
          const bookmark = bookmarks[bookmarkIndex];
          return {
            url: bookmark?.url || '',
            title: bookmark?.title || '',
            relevance: b.relevance || 0.5,
          };
        }),
        keyInsights: t.keyInsights || [],
      }));
    } catch {
      return [];
    }
  }

  /**
   * Parse connections from LLM response
   */
  private parseConnections(response: string, themes: ThemeCluster[]): TopicConnection[] {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonText.trim());

      return (parsed.connections || []).map((c: any) => ({
        from: themes[(c.from || 1) - 1]?.theme || '',
        to: themes[(c.to || 1) - 1]?.theme || '',
        connection: c.connection || '',
        strength: c.strength || 0.5,
      }));
    } catch {
      return [];
    }
  }
}
