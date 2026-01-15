/**
 * LLM Categorizer - Uses LLM to categorize bookmarks by topic
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';
import type { Analyzer } from './analysis-engine.js';
import type { AnalysisResult, LLMConfig } from './types.js';

/**
 * LLMCategorizer uses an LLM to automatically categorize bookmarks by topic
 *
 * Responsibilities:
 * - Integrate with OpenAI or Anthropic SDK
 * - Send bookmark text with categorization prompt
 * - Parse LLM response to extract category labels
 * - Add categories field to bookmark records
 * - Handle LLM failures with "uncategorized" fallback
 *
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5
 */
export class LLMCategorizer implements Analyzer {
  name = 'LLMCategorizer';
  private config: LLMConfig;
  private llmClient: LLMClient | null = null;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  /**
   * Initialize the LLM client based on the configured provider
   * @throws Error if provider is not supported or API key is missing
   */
  private async initializeClient(): Promise<void> {
    if (this.llmClient) {
      return; // Already initialized
    }

    if (!this.config.apiKey) {
      throw new Error('LLM API key is required');
    }

    switch (this.config.provider) {
      case 'openai':
        this.llmClient = new OpenAIClient(this.config.apiKey, this.config.model);
        break;
      case 'anthropic':
        this.llmClient = new AnthropicClient(this.config.apiKey, this.config.model);
        break;
      case 'custom':
        throw new Error('Custom LLM provider not yet implemented');
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }
  }

  /**
   * Categorize bookmark text using the configured LLM
   * @param text - The bookmark text to categorize
   * @returns Array of category labels
   *
   * Validates: Requirements 4.2, 4.3 - Send bookmark text to LLM and extract category labels
   */
  async categorize(text: string): Promise<string[]> {
    try {
      await this.initializeClient();

      if (!this.llmClient) {
        throw new Error('LLM client not initialized');
      }

      // Build the categorization prompt
      const prompt = this.buildPrompt(text);

      // Call the LLM
      const response = await this.llmClient.complete(prompt);

      // Parse the response to extract categories
      const categories = this.parseCategories(response);

      // Limit to maxCategories
      return categories.slice(0, this.config.maxCategories);
    } catch (error) {
      // Handle LLM failures with "uncategorized" fallback
      // Validates: Requirement 4.5
      console.error('LLM categorization failed:', error);
      return ['uncategorized'];
    }
  }

  /**
   * Build the categorization prompt with the bookmark text
   * @param text - The bookmark text
   * @returns The complete prompt to send to the LLM
   */
  private buildPrompt(text: string): string {
    // Use the configured prompt template, replacing {text} placeholder
    const promptTemplate =
      this.config.prompt ||
      'Categorize the following bookmark text into relevant topics. ' +
        'Return only a comma-separated list of category labels (e.g., "technology, programming, ai").\n\n' +
        'Text: {text}';

    return promptTemplate.replace('{text}', text);
  }

  /**
   * Parse the LLM response to extract category labels
   * @param response - The raw LLM response
   * @returns Array of category labels
   */
  private parseCategories(response: string): string[] {
    // Try to extract categories from the response
    // Expected format: comma-separated list or JSON array

    // Remove common prefixes/suffixes
    let cleaned = response.trim();
    cleaned = cleaned.replace(/^(categories?|topics?|labels?):\s*/i, '');
    cleaned = cleaned.replace(/^["'`]|["'`]$/g, '');

    // Try parsing as JSON array first
    if (cleaned.startsWith('[')) {
      try {
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed)) {
          return parsed.map((c) => String(c).trim().toLowerCase()).filter((c) => c.length > 0);
        }
      } catch {
        // Not valid JSON, continue with comma-separated parsing
      }
    }

    // Parse as comma-separated list
    const categories = cleaned
      .split(/[,;\n]/)
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0 && c.length < 50); // Reasonable category length

    return categories.length > 0 ? categories : ['uncategorized'];
  }

  /**
   * Analyze a bookmark and add categories
   * @param bookmark - The bookmark to analyze
   * @returns Analysis result with categories
   *
   * Validates: Requirement 4.4 - Add categories field to bookmark records
   */
  async analyze(bookmark: BookmarkRecord): Promise<AnalysisResult> {
    // Use the bookmark text for categorization
    const text = bookmark.text || '';

    if (!text) {
      // No text to categorize
      return { categories: ['uncategorized'] };
    }

    const categories = await this.categorize(text);

    return { categories };
  }

  /**
   * Configure the LLM categorizer
   * @param config - New configuration
   */
  configure(config: LLMConfig): void {
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
        temperature: 0.3, // Lower temperature for more consistent categorization
        max_tokens: 100, // Categories should be short
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
        max_tokens: 100,
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
