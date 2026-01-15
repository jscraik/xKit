import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { ConfigLoader } from '../../src/bookmark-export/config-loader.js';

describe('ConfigLoader', () => {
  const testDir = 'config-loader-test';
  const configPath = join(testDir, '.bookmark-export.config.json');

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
    // Clear environment variables
    delete process.env.X_API_KEY;
    delete process.env.X_API_SECRET;
    delete process.env.X_ACCESS_TOKEN;
    delete process.env.X_ACCESS_SECRET;
    delete process.env.EXPORT_OUTPUT_DIR;
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('loadExportConfig', () => {
    test('should load valid configuration from file', () => {
      const config = {
        xApi: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
          accessToken: 'test-token',
          accessSecret: 'test-access-secret',
        },
        output: {
          directory: './custom-exports',
          filenamePattern: 'custom_{timestamp}.json',
        },
        rateLimit: {
          maxRetries: 5,
          backoffMultiplier: 3,
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const loaded = ConfigLoader.loadExportConfig(configPath);

      expect(loaded.xApi.apiKey).toBe('test-key');
      expect(loaded.xApi.apiSecret).toBe('test-secret');
      expect(loaded.xApi.accessToken).toBe('test-token');
      expect(loaded.xApi.accessSecret).toBe('test-access-secret');
      expect(loaded.output.directory).toBe('./custom-exports');
      expect(loaded.output.filenamePattern).toBe('custom_{timestamp}.json');
      expect(loaded.rateLimit.maxRetries).toBe(5);
      expect(loaded.rateLimit.backoffMultiplier).toBe(3);
    });

    test('should use default values when config file does not exist', () => {
      process.env.X_API_KEY = 'env-key';
      process.env.X_API_SECRET = 'env-secret';

      const loaded = ConfigLoader.loadExportConfig('nonexistent.json');

      expect(loaded.xApi.apiKey).toBe('env-key');
      expect(loaded.xApi.apiSecret).toBe('env-secret');
      expect(loaded.output.directory).toBe('./exports');
      expect(loaded.output.filenamePattern).toBe('bookmarks_export_{timestamp}.json');
      expect(loaded.rateLimit.maxRetries).toBe(3);
      expect(loaded.rateLimit.backoffMultiplier).toBe(2);
    });

    test('should override config file with environment variables', () => {
      const config = {
        xApi: {
          apiKey: 'file-key',
          apiSecret: 'file-secret',
        },
        output: {
          directory: './file-exports',
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      process.env.X_API_KEY = 'env-key';
      process.env.X_API_SECRET = 'env-secret';
      process.env.X_ACCESS_TOKEN = 'env-token';
      process.env.EXPORT_OUTPUT_DIR = './env-exports';

      const loaded = ConfigLoader.loadExportConfig(configPath);

      expect(loaded.xApi.apiKey).toBe('env-key');
      expect(loaded.xApi.apiSecret).toBe('env-secret');
      expect(loaded.xApi.accessToken).toBe('env-token');
      expect(loaded.output.directory).toBe('./env-exports');
    });

    test('should throw error for missing API key', () => {
      const config = {
        xApi: {
          apiKey: '',
          apiSecret: 'test-secret',
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(() => ConfigLoader.loadExportConfig(configPath)).toThrow('X API key is required');
    });

    test('should throw error for missing API secret', () => {
      const config = {
        xApi: {
          apiKey: 'test-key',
          apiSecret: '',
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(() => ConfigLoader.loadExportConfig(configPath)).toThrow('X API secret is required');
    });

    test('should throw error for invalid maxRetries', () => {
      const config = {
        xApi: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
        rateLimit: {
          maxRetries: 0,
          backoffMultiplier: 2,
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(() => ConfigLoader.loadExportConfig(configPath)).toThrow('Rate limit maxRetries must be at least 1');
    });

    test('should throw error for invalid backoffMultiplier', () => {
      const config = {
        xApi: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
        rateLimit: {
          maxRetries: 3,
          backoffMultiplier: 0,
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      expect(() => ConfigLoader.loadExportConfig(configPath)).toThrow(
        'Rate limit backoffMultiplier must be at least 1',
      );
    });

    test('should throw error for invalid JSON in config file', () => {
      writeFileSync(configPath, 'invalid json {');

      expect(() => ConfigLoader.loadExportConfig(configPath)).toThrow('Failed to load config');
    });

    test('should merge partial config with defaults', () => {
      const config = {
        xApi: {
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
      };

      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const loaded = ConfigLoader.loadExportConfig(configPath);

      expect(loaded.xApi.apiKey).toBe('test-key');
      expect(loaded.output.directory).toBe('./exports');
      expect(loaded.rateLimit.maxRetries).toBe(3);
    });
  });
});
