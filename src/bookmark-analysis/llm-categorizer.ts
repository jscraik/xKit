/**
 * LLM Categorizer - Uses LLM to categorize bookmarks by topic
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';
import type { Analyzer } from './analysis-engine.js';
import type { AnalysisResult, LLMConfig } from './types.js';
import type { TokenUsage } from './token-types.js';
import type { TokenTracker } from './token-tracker.js';
import type { ModelRouter } from './model-router.js';
import type { RouterConfig } from './model-router.js';
import { Ollama } from 'ollama';

// Synchronous import to avoid race condition in constructor
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
let ModelRouterClass: typeof import('./model-router.js').ModelRouter | null = null;

/**
 * LLMCategorizer uses an LLM to automatically categorize bookmarks by topic
 *
 * Responsibilities:
 * - Integrate with OpenAI or Anthropic SDK
 * - Send bookmark text with categorization prompt
 * - Parse LLM response to extract category labels
 * - Add categories field to bookmark records
 * - Handle LLM failures with "uncategorized" fallback
 * - Use model router for cost optimization (if configured)
 *
 * Validates: Requirements 4.2, 4.3, 4.4, 4.5
 */
export class LLMCategorizer implements Analyzer {
  name = 'LLMCategorizer';
  private config: LLMConfig;
  private llmClient: LLMClient | null = null;
  private modelRouterConfig?: RouterConfig;

  constructor(config: LLMConfig, modelRouterConfig?: RouterConfig) {
    this.config = config;
    this.modelRouterConfig = modelRouterConfig;
  }

  /**
   * Get or create the model router (lazy initialization)
   */
  private async getModelRouter(): Promise<ModelRouter | null> {
    if (!this.modelRouterConfig) {
      return null;
    }

    // Import synchronously if not already loaded
    if (!ModelRouterClass) {
      const module = await import('./model-router.js');
      ModelRouterClass = module.ModelRouter;
    }

    // Create new instance (could be cached if needed)
    return new ModelRouterClass(this.modelRouterConfig);
  }

  /**
   * Initialize the LLM client based on the configured provider
   * @throws Error if provider is not supported or API key is missing
   */
  private async initializeClient(): Promise<void> {
    if (this.llmClient) {
      return; // Already initialized
    }

    switch (this.config.provider) {
      case 'openai':
        if (!this.config.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        this.llmClient = new OpenAIClient(this.config.apiKey, this.config.model);
        break;
      case 'anthropic':
        if (!this.config.apiKey) {
          throw new Error('Anthropic API key is required');
        }
        this.llmClient = new AnthropicClient(this.config.apiKey, this.config.model);
        break;
      case 'ollama':
        // Ollama is local, no API key needed
        this.llmClient = new OllamaLLMClient('', this.config.model);
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

      // Use model router if configured, otherwise call client directly
      let response: string;
      const router = await this.getModelRouter();
      if (router) {
        const result = await router.withFallback(
          'categorization',
          ['fast', 'balanced', 'quality'],
          async (model, provider) => {
            // Create client for this model
            const client = this.createClientForModel(provider, model);
            return await client.complete(prompt);
          },
        );
        response = result.result;
      } else {
        response = await this.llmClient.complete(prompt);
      }

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
   * Create a client for a specific model/provider combination
   */
  private createClientForModel(provider: string, model: string): LLMClient {
    switch (provider) {
      case 'openai':
        if (!this.config.apiKey) {
          throw new Error('OpenAI API key is required');
        }
        return new OpenAIClient(this.config.apiKey, model);
      case 'anthropic':
        if (!this.config.apiKey) {
          throw new Error('Anthropic API key is required');
        }
        return new AnthropicClient(this.config.apiKey, model);
      case 'ollama':
        // Ollama is a local LLM - no API key needed
        // Uses OLLAMA_HOST and OLLAMA_MODEL environment variables
        return new OllamaLLMClient('', model);
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
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

  /**
   * Set or update the model router strategy
   * @param strategy - New strategy for model selection
   */
  async setModelStrategy(strategy: 'fast' | 'balanced' | 'quality' | 'optimized'): Promise<void> {
    const router = await this.getModelRouter();
    if (router) {
      // Import predefined strategies
      const { PREDEFINED_STRATEGIES } = await import('./model-config.js');
      router.configure(PREDEFINED_STRATEGIES[strategy]);
    }
  }
}

/**
 * Abstract LLM client interface
 */
interface LLMClient {
  complete(prompt: string): Promise<string>;
  completeWithUsage(prompt: string, tracker?: TokenTracker): Promise<{ content: string; usage?: TokenUsage }>;
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
    const result = await this.completeWithUsage(prompt);
    return result.content;
  }

  async completeWithUsage(prompt: string, tracker?: TokenTracker): Promise<{ content: string; usage?: TokenUsage }> {
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
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No response from OpenAI');
    }

    const usage: TokenUsage = {
      input: data.usage?.prompt_tokens || 0,
      output: data.usage?.completion_tokens || 0,
      cacheRead: 0,
      cacheWrite: 0,
      cost: 0, // Will be calculated by tracker
    };

    if (tracker && data.usage) {
      tracker.record('categorization', this.model, 'openai', usage);
    }

    return { content: data.choices[0].message.content, usage };
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
    const result = await this.completeWithUsage(prompt);
    return result.content;
  }

  async completeWithUsage(prompt: string, tracker?: TokenTracker): Promise<{ content: string; usage?: TokenUsage }> {
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
      usage?: {
        input_tokens: number;
        output_tokens: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
    };

    if (!data.content || data.content.length === 0) {
      throw new Error('No response from Anthropic');
    }

    const usage: TokenUsage = {
      input: data.usage?.input_tokens || 0,
      output: data.usage?.output_tokens || 0,
      cacheRead: data.usage?.cache_read_input_tokens || 0,
      cacheWrite: data.usage?.cache_creation_input_tokens || 0,
      cost: 0,
    };

    if (tracker && data.usage) {
      tracker.record('categorization', this.model, 'anthropic', usage);
    }

    return { content: data.content[0].text, usage };
  }
}

/**
 * Ollama client implementation for local LLM
 */
class OllamaLLMClient implements LLMClient {
  private client: Ollama;
  private model: string;
  private host: string;

  constructor(apiKey: string, model: string) {
    // apiKey is ignored for Ollama (local LLM)
    this.model = model || process.env.OLLAMA_MODEL || 'qwen2.5:7b';
    this.host = process.env.OLLAMA_HOST || 'http://localhost:11434';

    this.client = new Ollama({
      host: this.host,
    });
  }

  async complete(prompt: string): Promise<string> {
    const result = await this.completeWithUsage(prompt);
    return result.content;
  }

  async completeWithUsage(prompt: string, tracker?: TokenTracker): Promise<{ content: string; usage?: TokenUsage }> {
    try {
      const response = await this.client.generate({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 100, // Categories should be short
        },
      });

      // Extract token usage from Ollama response
      const usage: TokenUsage = {
        input: response.prompt_eval_count || 0,
        output: response.eval_count || 0,
        cacheRead: 0,
        cacheWrite: 0,
        cost: 0, // Ollama is free (local)
      };

      if (tracker) {
        tracker.record('categorization', this.model, 'ollama', usage);
      }

      return { content: response.response, usage };
    } catch (error) {
      throw new Error(
        `Ollama error (${this.host}/${this.model}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
