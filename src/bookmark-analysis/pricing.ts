/**
 * Model pricing data (as of 2025-01-19)
 */

import type { PricingData } from './token-types.js';

export const MODEL_PRICING: Record<string, PricingData> = {
  // Anthropic
  'claude-3-haiku-20240307': {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
    cacheReadPerMillion: 0.03,
    cacheWritePerMillion: 0.30,
  },
  'claude-3-5-sonnet-20241022': {
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    inputPerMillion: 3.00,
    outputPerMillion: 15.00,
    cacheReadPerMillion: 0.30,
    cacheWritePerMillion: 3.00,
  },
  // OpenAI
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    inputPerMillion: 0.15,
    outputPerMillion: 0.60,
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    inputPerMillion: 2.50,
    outputPerMillion: 10.00,
  },
  // Ollama (local, always free)
  'ollama': {
    provider: 'ollama',
    model: '*',
    inputPerMillion: 0,
    outputPerMillion: 0,
  },
};

export function getModelPricing(model: string): PricingData | undefined {
  // Try exact match first
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }
  // Check for Ollama models
  if (model.startsWith('llama') || model.startsWith('mistral') || model.startsWith('qwen')) {
    return MODEL_PRICING['ollama'];
  }
  return undefined;
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheReadTokens = 0,
  cacheWriteTokens = 0,
): number {
  const pricing = getModelPricing(model);
  if (!pricing || pricing.provider === 'ollama') {
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  let totalCost = inputCost + outputCost;

  if (pricing.cacheReadPerMillion && cacheReadTokens > 0) {
    totalCost += (cacheReadTokens / 1_000_000) * pricing.cacheReadPerMillion;
  }
  if (pricing.cacheWritePerMillion && cacheWriteTokens > 0) {
    totalCost += (cacheWriteTokens / 1_000_000) * pricing.cacheWritePerMillion;
  }

  return Math.round(totalCost * 1000) / 1000; // Round to 3 decimals
}
