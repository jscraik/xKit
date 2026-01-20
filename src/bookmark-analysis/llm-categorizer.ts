/**
 * LLM Categorizer - Uses LLM to categorize bookmarks by topic
 */

import type { BookmarkRecord } from '../bookmark-export/types.js';
import type { Analyzer } from './analysis-engine.js';
import type { AnalysisResult, LLMConfig } from './types.js';
import type { ModelRouter } from './model-router.js';
import type { RouterConfig } from './model-router.js';
import { logger } from '../observability/logger.js';
import { createLLMClient, type LLMClient, type LLMClientConfig } from '../llm/llm-clients.js';

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

    // Use factory function to create client
    this.llmClient = createLLMClient({
      provider: this.config.provider,
      apiKey: this.config.apiKey,
      model: this.config.model,
    });
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
          async (model: string, provider: string) => {
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      const textPreview = text.substring(0, 50); // Redact full text for security

      logger.error({
        event: 'llm_categorization_failed',
        textPreview,
        error: errorMessage,
        provider: this.config.provider,
        model: this.config.model,
      }, 'LLM categorization failed');

      return ['uncategorized'];
    }
  }

  /**
   * Create a client for a specific model/provider combination
   */
  private createClientForModel(provider: string, model: string): LLMClient {
    const config: LLMClientConfig = {
      provider: provider as LLMClientConfig['provider'],
      apiKey: this.config.apiKey,
      model,
    };

    try {
      return createLLMClient(config);
    } catch (error) {
      // If custom provider not implemented, fallback to OpenAI
      if (provider === 'custom') {
        return createLLMClient({ provider: 'openai', apiKey: this.config.apiKey, model });
      }
      throw error;
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

// All LLM client implementations removed - now using shared implementations from src/llm/llm-clients.ts
