/**
 * Usefulness Scorer - Ranks bookmarks by usefulness using LLM, heuristic, or hybrid methods
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';
import type { Analyzer } from './analysis-engine.js';
import type { AnalysisResult, ScoringConfig } from './types.js';

/**
 * UsefulnessScorer evaluates bookmarks and assigns usefulness scores between 0 and 100
 *
 * Responsibilities:
 * - Support LLM-based scoring method
 * - Support heuristic scoring using engagement metrics and recency
 * - Support hybrid scoring combining both methods
 * - Assign scores between 0 and 100
 * - Add usefulnessScore field to bookmark records
 *
 * Validates: Requirements 5.1, 5.3, 5.4, 5.5
 */
export class UsefulnessScorer implements Analyzer {
  name = 'UsefulnessScorer';
  private config: ScoringConfig;
  private llmClient: LLMClient | null = null;

  constructor(config: ScoringConfig) {
    this.config = config;
  }

  /**
   * Initialize the LLM client if needed for LLM or hybrid scoring
   * @throws Error if provider is not supported or API key is missing
   */
  private async initializeClient(): Promise<void> {
    if (this.llmClient) {
      return; // Already initialized
    }

    if (!this.config.llmConfig) {
      throw new Error('LLM configuration is required for LLM-based scoring');
    }

    if (!this.config.llmConfig.apiKey) {
      throw new Error('LLM API key is required');
    }

    switch (this.config.llmConfig.provider) {
      case 'openai':
        this.llmClient = new OpenAIClient(this.config.llmConfig.apiKey, this.config.llmConfig.model);
        break;
      case 'anthropic':
        this.llmClient = new AnthropicClient(this.config.llmConfig.apiKey, this.config.llmConfig.model);
        break;
      case 'custom':
        throw new Error('Custom LLM provider not yet implemented');
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.llmConfig.provider}`);
    }
  }

  /**
   * Score a bookmark using heuristic method based on engagement metrics and recency
   * @param bookmark - The bookmark to score
   * @returns Usefulness score between 0 and 100
   *
   * Validates: Requirement 5.5 - Support heuristic scoring method
   */
  private scoreHeuristic(bookmark: BookmarkRecord): number {
    const weights = this.config.weights;

    // Calculate engagement score (0-100)
    // Normalize engagement metrics using logarithmic scale to handle wide ranges
    const totalEngagement = bookmark.likeCount + bookmark.retweetCount * 2 + bookmark.replyCount * 1.5;
    const engagementScore = Math.min(100, Math.log10(totalEngagement + 1) * 20);

    // Calculate recency score (0-100)
    // More recent bookmarks get higher scores
    const now = Date.now();
    const createdAt = new Date(bookmark.createdAt).getTime();
    const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);

    // Exponential decay: score decreases as age increases
    // Half-life of 30 days
    const recencyScore = Math.max(0, 100 * Math.exp(-ageInDays / 30));

    // Calculate content quality score (0-100)
    // Based on text length and presence of URLs
    const textLength = bookmark.text.length;
    const hasUrl = bookmark.url.length > 0;

    // Longer text (up to a point) indicates more substantial content
    const lengthScore = Math.min(100, (textLength / 280) * 100); // Twitter max is 280 chars
    const urlBonus = hasUrl ? 10 : 0;
    const contentQualityScore = Math.min(100, lengthScore + urlBonus);

    // Weighted combination
    const finalScore =
      engagementScore * weights.engagement +
      recencyScore * weights.recency +
      contentQualityScore * weights.contentQuality;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, Math.round(finalScore)));
  }

  /**
   * Score a bookmark using LLM-based evaluation
   * @param bookmark - The bookmark to score
   * @returns Usefulness score between 0 and 100
   *
   * Validates: Requirement 5.5 - Support LLM-based scoring method
   */
  private async scoreLLM(bookmark: BookmarkRecord): Promise<number> {
    try {
      await this.initializeClient();

      if (!this.llmClient) {
        throw new Error('LLM client not initialized');
      }

      // Build the scoring prompt
      const prompt = this.buildScoringPrompt(bookmark);

      // Call the LLM
      const response = await this.llmClient.complete(prompt);

      // Parse the score from the response
      const score = this.parseScore(response);

      return score;
    } catch (error) {
      console.error('LLM scoring failed:', error);
      // Fallback to heuristic scoring on LLM failure
      return this.scoreHeuristic(bookmark);
    }
  }

  /**
   * Build the scoring prompt for LLM evaluation
   * @param bookmark - The bookmark to score
   * @returns The complete prompt to send to the LLM
   */
  private buildScoringPrompt(bookmark: BookmarkRecord): string {
    const promptTemplate =
      this.config.llmConfig?.prompt ||
      'Evaluate the usefulness of the following bookmark on a scale of 0 to 100, ' +
        'where 0 is completely useless and 100 is extremely useful. ' +
        'Consider factors like content quality, relevance, and potential value. ' +
        'Respond with only a number between 0 and 100.\n\n' +
        'Text: {text}\n' +
        'Author: {author}\n' +
        'Engagement: {likes} likes, {retweets} retweets, {replies} replies\n' +
        'Created: {date}';

    return promptTemplate
      .replace('{text}', bookmark.text)
      .replace('{author}', bookmark.authorUsername)
      .replace('{likes}', bookmark.likeCount.toString())
      .replace('{retweets}', bookmark.retweetCount.toString())
      .replace('{replies}', bookmark.replyCount.toString())
      .replace('{date}', bookmark.createdAt);
  }

  /**
   * Parse the score from LLM response
   * @param response - The raw LLM response
   * @returns Score between 0 and 100
   */
  private parseScore(response: string): number {
    // Extract the first number from the response
    const match = response.match(/\d+/);

    if (!match) {
      throw new Error('No numeric score found in LLM response');
    }

    const score = Number.parseInt(match[0], 10);

    // Ensure score is between 0 and 100
    if (Number.isNaN(score) || score < 0 || score > 100) {
      throw new Error(`Invalid score: ${score}`);
    }

    return score;
  }

  /**
   * Score a bookmark using hybrid method (combination of LLM and heuristic)
   * @param bookmark - The bookmark to score
   * @returns Usefulness score between 0 and 100
   *
   * Validates: Requirement 5.5 - Support hybrid scoring method
   */
  private async scoreHybrid(bookmark: BookmarkRecord): Promise<number> {
    // Get both scores
    const heuristicScore = this.scoreHeuristic(bookmark);
    const llmScore = await this.scoreLLM(bookmark);

    // Average the two scores
    const hybridScore = Math.round((heuristicScore + llmScore) / 2);

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, hybridScore));
  }

  /**
   * Score a bookmark based on the configured method
   * @param bookmark - The bookmark to score
   * @returns Usefulness score between 0 and 100
   *
   * Validates: Requirements 5.1, 5.3, 5.4 - Evaluate bookmark and assign score between 0 and 100
   */
  async score(bookmark: BookmarkRecord): Promise<number> {
    switch (this.config.method) {
      case 'heuristic':
        return this.scoreHeuristic(bookmark);
      case 'llm':
        return await this.scoreLLM(bookmark);
      case 'hybrid':
        return await this.scoreHybrid(bookmark);
      default:
        throw new Error(`Unsupported scoring method: ${this.config.method}`);
    }
  }

  /**
   * Analyze a bookmark and add usefulness score
   * @param bookmark - The bookmark to analyze
   * @returns Analysis result with usefulness score
   *
   * Validates: Requirement 5.4 - Add usefulnessScore field to bookmark records
   */
  async analyze(bookmark: BookmarkRecord): Promise<AnalysisResult> {
    const usefulnessScore = await this.score(bookmark);

    return { usefulnessScore };
  }

  /**
   * Configure the usefulness scorer
   * @param config - New configuration
   */
  configure(config: ScoringConfig): void {
    this.config = config;
    this.llmClient = null; // Reset client to force reinitialization
  }
}

/**
 * Abstract LLM client interface
 */
interface LLMClient {
  complete(prompt: string): Promise<string>;
}

/**
 * OpenAI client implementation
 */
class OpenAIClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model || 'gpt-4';
  }

  async complete(prompt: string): Promise<string> {
    // Make API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent scoring
        max_tokens: 50, // Score should be short
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message: {
          content: string;
        };
      }>;
    };

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    return data.choices[0].message.content;
  }
}

/**
 * Anthropic client implementation
 */
class AnthropicClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model || 'claude-3-haiku-20240307';
  }

  async complete(prompt: string): Promise<string> {
    // Make API call to Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 50,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      content?: Array<{
        text: string;
      }>;
    };

    if (!data.content || data.content.length === 0) {
      throw new Error('No response from Anthropic');
    }

    return data.content[0].text;
  }
}
