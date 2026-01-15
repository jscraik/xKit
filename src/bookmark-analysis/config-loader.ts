/**
 * Configuration loader for bookmark analysis
 */

import { existsSync, readFileSync } from 'node:fs';
import type { LLMConfig, ScoringConfig } from './types.js';

export interface AnalysisConfig {
  llm: LLMConfig & {
    categorization: {
      enabled: boolean;
      prompt: string;
      maxCategories: number;
    };
  };
  scoring: ScoringConfig;
  customScripts: string[];
  output: {
    directory: string;
    filenamePattern: string;
  };
}

const DEFAULT_CONFIG: AnalysisConfig = {
  llm: {
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    prompt: 'Categorize this bookmark into topics. Return a JSON array of category strings.',
    maxCategories: 3,
    categorization: {
      enabled: true,
      prompt: 'Categorize this bookmark into topics. Return a JSON array of category strings.',
      maxCategories: 3,
    },
  },
  scoring: {
    method: 'heuristic',
    weights: {
      engagement: 0.3,
      recency: 0.2,
      contentQuality: 0.5,
    },
  },
  customScripts: [],
  output: {
    directory: './analysis',
    filenamePattern: 'bookmarks_analyzed_{method}_{timestamp}.json',
  },
};

export class AnalysisConfigLoader {
  /**
   * Load analysis configuration from file and environment variables
   */
  static loadAnalysisConfig(configPath = '.bookmark-analysis.config.json'): AnalysisConfig {
    const config = { ...DEFAULT_CONFIG };

    // Load from file if exists
    if (existsSync(configPath)) {
      try {
        const fileContent = readFileSync(configPath, 'utf-8');
        const fileConfig = JSON.parse(fileContent);
        Object.assign(config, AnalysisConfigLoader.mergeDeep(config, fileConfig));
      } catch (error) {
        throw new Error(`Failed to load config from ${configPath}: ${error}`);
      }
    }

    // Override with environment variables
    if (process.env.LLM_API_KEY) {
      config.llm.apiKey = process.env.LLM_API_KEY;
    }
    if (process.env.LLM_PROVIDER) {
      config.llm.provider = process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'custom';
    }
    if (process.env.LLM_MODEL) {
      config.llm.model = process.env.LLM_MODEL;
    }
    if (process.env.ANALYSIS_OUTPUT_DIR) {
      config.output.directory = process.env.ANALYSIS_OUTPUT_DIR;
    }

    // Validate configuration
    AnalysisConfigLoader.validateAnalysisConfig(config);

    return config;
  }

  /**
   * Validate analysis configuration
   */
  private static validateAnalysisConfig(config: AnalysisConfig): void {
    if (config.llm.categorization.enabled && !config.llm.apiKey) {
      throw new Error(
        'LLM API key is required when categorization is enabled (set LLM_API_KEY environment variable or add to config file)',
      );
    }
    if (config.scoring.method === 'llm' && !config.llm.apiKey) {
      throw new Error(
        'LLM API key is required for LLM-based scoring (set LLM_API_KEY environment variable or add to config file)',
      );
    }
    if (config.llm.categorization.maxCategories < 1) {
      throw new Error('maxCategories must be at least 1');
    }
    const validMethods = ['llm', 'heuristic', 'hybrid'];
    if (!validMethods.includes(config.scoring.method)) {
      throw new Error(`Invalid scoring method: ${config.scoring.method}. Must be one of: ${validMethods.join(', ')}`);
    }
  }

  /**
   * Deep merge two objects
   */
  private static mergeDeep(target: any, source: any): any {
    const output = { ...target };
    if (AnalysisConfigLoader.isObject(target) && AnalysisConfigLoader.isObject(source)) {
      for (const key of Object.keys(source)) {
        if (AnalysisConfigLoader.isObject(source[key])) {
          if (key in target) {
            output[key] = AnalysisConfigLoader.mergeDeep(target[key], source[key]);
          } else {
            Object.assign(output, { [key]: source[key] });
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      }
    }
    return output;
  }

  /**
   * Check if value is an object
   */
  private static isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}
