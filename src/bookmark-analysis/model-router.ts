/**
 * ModelRouter - Routes tasks to appropriate model tiers for cost optimization
 */

import type { ModelTier, ModelStrategy, ModelOperation, ModelTierType } from './model-config.js';
import { getModelTier, getModelTiersByQuality, validateStrategy } from './model-config.js';
import { calculateCost } from './pricing.js';

/**
 * Router configuration
 */
export interface RouterConfig {
  /** Available model tiers */
  tiers: Record<string, ModelTier>;
  /** Strategy for selecting tiers */
  strategy: ModelStrategy;
}

/**
 * Model selection result with cost estimate
 */
export interface ModelSelection {
  /** Selected tier */
  tier: ModelTier;
  /** Estimated cost for this operation */
  estimatedCost: number;
  /** Whether fallback was used */
  fallback: boolean;
}

/**
 * Execution result with model metadata
 */
export interface ExecutionResult<T = any> {
  /** The result from the model */
  result: T;
  /** Model that was used */
  model: string;
  /** Provider that was used */
  provider: string;
  /** Whether fallback occurred */
  fallback: boolean;
  /** Actual cost (if tracked) */
  cost?: number;
}

export class ModelRouter {
  private currentStrategy: ModelStrategy;

  constructor(private config: RouterConfig) {
    this.validateConfig();
    this.currentStrategy = { ...config.strategy };
  }

  private validateConfig(): void {
    const validation = validateStrategy(this.config.strategy, this.config.tiers);
    if (!validation.valid) {
      throw new Error(`Invalid model router configuration: ${validation.errors.join(', ')}`);
    }
  }

  /**
   * Get the appropriate model tier for an operation
   */
  route(operation: ModelOperation): ModelTier {
    const tierName = this.currentStrategy[operation];
    const tiers = getModelTiersByQuality(this.config.tiers, tierName);

    if (tiers.length === 0) {
      throw new Error(`No model tier available for operation: ${operation} (quality: ${tierName})`);
    }

    // Return the first matching tier (could be enhanced to load-balance)
    return tiers[0];
  }

  /**
   * Get model with fallback chain
   * Tries each tier in order until one succeeds
   */
  async withFallback(
    operation: ModelOperation,
    tierNames: ModelTierType[],
    executeWithModel: (model: string, provider: string) => Promise<any>,
  ): Promise<ExecutionResult> {
    let lastError: Error | undefined;

    for (const tierName of tierNames) {
      const tiers = getModelTiersByQuality(this.config.tiers, tierName);
      if (tiers.length === 0) {
        continue;
      }

      const tier = tiers[0];
      try {
        const result = await executeWithModel(tier.model, tier.provider);
        return {
          result,
          model: tier.model,
          provider: tier.provider,
          fallback: false,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        // Log the failure and try next tier
        console.warn(`Model tier '${tierName}' (${tier.model}) failed: ${lastError.message}`);
      }
    }

    throw lastError || new Error('All model tiers failed');
  }

  /**
   * Get cost estimate for an operation
   */
  estimateCost(
    operation: ModelOperation,
    inputTokens: number,
    outputTokens: number,
  ): ModelSelection {
    const tier = this.route(operation);
    const cost = calculateCost(tier.model, inputTokens, outputTokens);

    return {
      tier,
      estimatedCost: cost,
      fallback: false,
    };
  }

  /**
   * Update model strategy
   */
  configure(strategy: Partial<ModelStrategy>): void {
    this.currentStrategy = {
      ...this.currentStrategy,
      ...strategy,
    };
    this.validateConfig();
  }

  /**
   * Get current strategy
   */
  getStrategy(): ModelStrategy {
    return { ...this.currentStrategy };
  }

  /**
   * Get all available tiers
   */
  getTiers(): Record<string, ModelTier> {
    return { ...this.config.tiers };
  }

  /**
   * Get a specific tier by name
   */
  getTier(name: string): ModelTier | undefined {
    return getModelTier(this.config.tiers, name);
  }
}
