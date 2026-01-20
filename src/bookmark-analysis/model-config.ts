/**
 * Model tier configuration for cost optimization
 */

/**
 * Model tier quality levels
 */
export type ModelTierType = 'fast' | 'balanced' | 'quality';

/**
 * Model operation types
 */
export type ModelOperation = 'categorization' | 'summarization' | 'analysis';

/**
 * A model tier definition
 */
export interface ModelTier {
  /** Unique identifier for this tier */
  name: string;
  /** Quality level: fast (cheap), balanced, or quality (expensive) */
  quality: ModelTierType;
  /** The actual model identifier to use with the API */
  model: string;
  /** Provider: anthropic, openai, or ollama */
  provider: 'anthropic' | 'openai' | 'ollama';
  /** Maximum tokens for this model (context window) */
  maxTokens: number;
  /** Whether this tier supports caching (Anthropic) */
  supportsCaching: boolean;
  /** Relative cost multiplier (1.0 = baseline) */
  costMultiplier: number;
  /** Recommended for these operations */
  recommendedFor: ModelOperation[];
}

/**
 * Model strategy: which tier to use for each operation
 */
export interface ModelStrategy {
  /** Model tier for categorization tasks */
  categorization: ModelTierType;
  /** Model tier for summarization tasks */
  summarization: ModelTierType;
  /** Model tier for analysis tasks */
  analysis: ModelTierType;
}

/**
 * Predefined model strategies
 */
export const PREDEFINED_STRATEGIES: Record<string, ModelStrategy> = {
  /** Fastest processing, lowest cost */
  fast: {
    categorization: 'fast',
    summarization: 'fast',
    analysis: 'fast',
  },
  /** Balance between speed and quality */
  balanced: {
    categorization: 'fast',
    summarization: 'balanced',
    analysis: 'balanced',
  },
  /** Highest quality, higher cost */
  quality: {
    categorization: 'balanced',
    summarization: 'quality',
    analysis: 'quality',
  },
  /** Cost-optimized: use cheapest model for everything */
  optimized: {
    categorization: 'fast',
    summarization: 'fast',
    analysis: 'fast',
  },
};

/**
 * Default model tier definitions
 */
export const DEFAULT_MODEL_TIERS: Record<string, ModelTier> = {
  'anthropic-haiku': {
    name: 'anthropic-haiku',
    quality: 'fast',
    model: 'claude-3-haiku-20240307',
    provider: 'anthropic',
    maxTokens: 200000,
    supportsCaching: true,
    costMultiplier: 1.0,
    recommendedFor: ['categorization', 'summarization', 'analysis'],
  },
  'anthropic-sonnet': {
    name: 'anthropic-sonnet',
    quality: 'balanced',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    maxTokens: 200000,
    supportsCaching: true,
    costMultiplier: 12.0,
    recommendedFor: ['summarization', 'analysis'],
  },
  'openai-gpt4o-mini': {
    name: 'openai-gpt4o-mini',
    quality: 'fast',
    model: 'gpt-4o-mini',
    provider: 'openai',
    maxTokens: 128000,
    supportsCaching: false,
    costMultiplier: 0.6,
    recommendedFor: ['categorization'],
  },
  'openai-gpt4o': {
    name: 'openai-gpt4o',
    quality: 'balanced',
    model: 'gpt-4o',
    provider: 'openai',
    maxTokens: 128000,
    supportsCaching: false,
    costMultiplier: 10.0,
    recommendedFor: ['summarization', 'analysis'],
  },
  'ollama-default': {
    name: 'ollama-default',
    quality: 'fast',
    model: 'qwen2.5:7b',
    provider: 'ollama',
    maxTokens: 32768,
    supportsCaching: false,
    costMultiplier: 0,
    recommendedFor: ['categorization', 'summarization'],
  },
};

/**
 * Get model tiers by quality level
 */
export function getModelTiersByQuality(
  tiers: Record<string, ModelTier>,
  quality: ModelTierType,
): ModelTier[] {
  return Object.values(tiers).filter(tier => tier.quality === quality);
}

/**
 * Get model tier by name
 */
export function getModelTier(
  tiers: Record<string, ModelTier>,
  name: string,
): ModelTier | undefined {
  return tiers[name];
}

/**
 * Validate a model strategy
 */
export function validateStrategy(
  strategy: ModelStrategy,
  tiers: Record<string, ModelTier>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const qualities: ModelTierType[] = ['fast', 'balanced', 'quality'];

  for (const quality of qualities) {
    const tier = getModelTiersByQuality(tiers, quality);
    if (tier.length === 0) {
      errors.push(`No model tier defined for quality level: ${quality}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
