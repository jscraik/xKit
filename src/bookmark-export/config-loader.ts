/**
 * Configuration loader for bookmark export
 */

import { existsSync, readFileSync } from 'node:fs';

export interface ExportConfig {
    xApi: {
        apiKey: string;
        apiSecret: string;
        accessToken?: string;
        accessSecret?: string;
    };
    output: {
        directory: string;
        filenamePattern: string;
    };
    rateLimit: {
        maxRetries: number;
        backoffMultiplier: number;
    };
}

const DEFAULT_CONFIG: ExportConfig = {
    xApi: {
        apiKey: '',
        apiSecret: '',
    },
    output: {
        directory: './exports',
        filenamePattern: 'bookmarks_export_{timestamp}.json',
    },
    rateLimit: {
        maxRetries: 3,
        backoffMultiplier: 2,
    },
};

export class ConfigLoader {
    /**
     * Load export configuration from file and environment variables
     */
    static loadExportConfig(configPath = '.bookmark-export.config.json'): ExportConfig {
        const config = { ...DEFAULT_CONFIG };

        // Load from file if exists
        if (existsSync(configPath)) {
            try {
                const fileContent = readFileSync(configPath, 'utf-8');
                const fileConfig = JSON.parse(fileContent);
                Object.assign(config, this.mergeDeep(config, fileConfig));
            } catch (error) {
                throw new Error(`Failed to load config from ${configPath}: ${error}`);
            }
        }

        // Override with environment variables
        if (process.env.X_API_KEY) {
            config.xApi.apiKey = process.env.X_API_KEY;
        }
        if (process.env.X_API_SECRET) {
            config.xApi.apiSecret = process.env.X_API_SECRET;
        }
        if (process.env.X_ACCESS_TOKEN) {
            config.xApi.accessToken = process.env.X_ACCESS_TOKEN;
        }
        if (process.env.X_ACCESS_SECRET) {
            config.xApi.accessSecret = process.env.X_ACCESS_SECRET;
        }
        if (process.env.EXPORT_OUTPUT_DIR) {
            config.output.directory = process.env.EXPORT_OUTPUT_DIR;
        }

        // Validate required fields
        this.validateExportConfig(config);

        return config;
    }

    /**
     * Validate export configuration
     */
    private static validateExportConfig(config: ExportConfig): void {
        if (!config.xApi.apiKey) {
            throw new Error('X API key is required (set X_API_KEY environment variable or add to config file)');
        }
        if (!config.xApi.apiSecret) {
            throw new Error('X API secret is required (set X_API_SECRET environment variable or add to config file)');
        }
        if (config.rateLimit.maxRetries < 1) {
            throw new Error('Rate limit maxRetries must be at least 1');
        }
        if (config.rateLimit.backoffMultiplier < 1) {
            throw new Error('Rate limit backoffMultiplier must be at least 1');
        }
    }

    /**
     * Deep merge two objects
     */
    private static mergeDeep(target: any, source: any): any {
        const output = { ...target };
        if (this.isObject(target) && this.isObject(source)) {
            for (const key of Object.keys(source)) {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.mergeDeep(target[key], source[key]);
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
