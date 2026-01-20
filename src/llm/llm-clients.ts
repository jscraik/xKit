/**
 * Shared LLM client implementations
 * Provides unified interface for OpenAI, Anthropic, and Ollama providers
 */

import type { TokenUsage } from '../bookmark-analysis/token-types.js';
import type { TokenTracker } from '../bookmark-analysis/token-tracker.js';
import { Ollama } from 'ollama';

/**
 * Configuration for creating an LLM client
 */
export interface LLMClientConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom';
  apiKey?: string;
  model: string;
  host?: string; // For Ollama
}

/**
 * Abstract LLM client interface
 * All providers implement this interface for consistency
 */
export interface LLMClient {
  /**
   * Complete a prompt and return the response text
   * @param prompt - The prompt to send to the LLM
   * @returns The LLM response text
   */
  complete(prompt: string): Promise<string>;

  /**
   * Complete a prompt and track token usage
   * @param prompt - The prompt to send to the LLM
   * @param tracker - Optional token tracker for usage statistics
   * @returns The LLM response and token usage information
   */
  completeWithUsage(
    prompt: string,
    tracker?: TokenTracker
  ): Promise<{ content: string; usage?: TokenUsage }>;
}

/**
 * Factory function to create the appropriate LLM client
 * @throws Error if provider is unsupported or API key is missing
 */
export function createLLMClient(config: LLMClientConfig): LLMClient {
  switch (config.provider) {
    case 'openai':
      if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIClient(config.apiKey, config.model);
    
    case 'anthropic':
      if (!config.apiKey) {
        throw new Error('Anthropic API key is required');
      }
      return new AnthropicClient(config.apiKey, config.model);
    
    case 'ollama':
      return new OllamaLLMClient(config.host, config.model);
    
    case 'custom':
      throw new Error('Custom LLM provider not yet implemented');
  }
}

/**
 * OpenAI client implementation
 * Uses Chat Completions API with structured responses
 */
export class OpenAIClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const result = await this.completeWithUsage(prompt);
    return result.content;
  }

  async completeWithUsage(
    prompt: string,
    tracker?: TokenTracker
  ): Promise<{ content: string; usage?: TokenUsage }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      choices?: Array<{ message: { content: string } }>;
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
      cost: 0,
    };

    if (tracker && data.usage) {
      tracker.record('llm', this.model, 'openai', usage);
    }

    return { content: data.choices[0].message.content, usage };
  }
}

/**
 * Anthropic client implementation
 * Uses Messages API with prompt caching support
 */
export class AnthropicClient implements LLMClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async complete(prompt: string): Promise<string> {
    const result = await this.completeWithUsage(prompt);
    return result.content;
  }

  async completeWithUsage(
    prompt: string,
    tracker?: TokenTracker
  ): Promise<{ content: string; usage?: TokenUsage }> {
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
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as {
      content?: Array<{ text: string }>;
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
      tracker.record('llm', this.model, 'anthropic', usage);
    }

    return { content: data.content[0].text, usage };
  }
}

/**
 * Ollama client implementation for local LLM inference
 * Uses ollama-js library with configurable host
 */
export class OllamaLLMClient implements LLMClient {
  private client: Ollama;
  private model: string;
  private host: string;

  constructor(host: string | undefined, model: string) {
    this.model = model || process.env.OLLAMA_MODEL || 'qwen2.5:7b';
    this.host = host || process.env.OLLAMA_HOST || 'http://localhost:11434';

    this.client = new Ollama({ host: this.host });
  }

  async complete(prompt: string): Promise<string> {
    const result = await this.completeWithUsage(prompt);
    return result.content;
  }

  async completeWithUsage(
    prompt: string,
    tracker?: TokenTracker
  ): Promise<{ content: string; usage?: TokenUsage }> {
    try {
      const response = await this.client.generate({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: 0.3,
          top_p: 0.9,
          num_predict: 100,
        },
      });

      const usage: TokenUsage = {
        input: response.prompt_eval_count || 0,
        output: response.eval_count || 0,
        cacheRead: 0,
        cacheWrite: 0,
        cost: 0,
      };

      if (tracker) {
        tracker.record('llm', this.model, 'ollama', usage);
      }

      return { content: response.response, usage };
    } catch (error) {
      throw new Error(
        `Ollama error (${this.host}/${this.model}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}