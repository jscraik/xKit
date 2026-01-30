import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ErrorLogger } from '../../../src/commands/shared/error-logger.js';

const TEST_DIR = '/tmp/xkit-error-logger-test';

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeAll(() => {
    // Create test directory once before all tests
    try {
      mkdirSync(TEST_DIR, { recursive: true });
    } catch {
      // Directory may already exist
    }
  });

  beforeEach(() => {
    logger = new ErrorLogger(TEST_DIR, 'test-errors.log');
    logger.clear();
  });

  afterAll(() => {
    // Clean up test directory after all tests
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it('initializes with zero errors', () => {
    expect(logger.getCount()).toBe(0);
  });

  it('logs errors with operation context', () => {
    logger.log('fetch-tweet', 'Network error', 'https://example.com');
    expect(logger.getCount()).toBe(1);
  });

  it('logs errors without URL', () => {
    logger.log('parse-data', 'Invalid JSON');
    expect(logger.getCount()).toBe(1);
  });

  it('tracks errors by operation', () => {
    logger.log('operation-a', 'Error 1');
    logger.log('operation-a', 'Error 2');
    logger.log('operation-b', 'Error 3');

    const summary = logger.getSummary();
    expect(summary['operation-a']).toBe(2);
    expect(summary['operation-b']).toBe(1);
  });

  it('returns all logged errors', () => {
    logger.log('op1', 'error1');
    logger.log('op2', 'error2', 'https://test.com');

    const errors = logger.getErrors();
    expect(errors).toHaveLength(2);
    expect(errors[0].operation).toBe('op1');
    expect(errors[1].url).toBe('https://test.com');
  });

  it('filters errors by operation', () => {
    logger.log('fetch', 'Error A');
    logger.log('parse', 'Error B');
    logger.log('fetch', 'Error C');

    const fetchErrors = logger.getErrorsForOperation('fetch');
    expect(fetchErrors).toHaveLength(2);
    expect(fetchErrors[0].error).toBe('Error A');
    expect(fetchErrors[1].error).toBe('Error C');
  });

  it('clears all errors', () => {
    logger.log('test', 'error');
    expect(logger.getCount()).toBe(1);
    logger.clear();
    expect(logger.getCount()).toBe(0);
  });

  it('saves errors to file', () => {
    logger.log('test-operation', 'Test error message', 'https://example.com');
    logger.save();

    expect(logger.exists()).toBe(true);
  });

  it('does not save when no errors logged', () => {
    // Clear any existing file from previous tests
    const { unlinkSync } = require('node:fs');
    const { join } = require('node:path');
    try {
      unlinkSync(join(TEST_DIR, 'test-errors.log'));
    } catch {
      // File doesn't exist, that's fine
    }
    logger.save();
    expect(logger.exists()).toBe(false);
  });

  it('includes timestamp in error logs', () => {
    const beforeTime = new Date().toISOString();
    logger.log('test', 'error');
    const afterTime = new Date().toISOString();

    const errors = logger.getErrors();
    const timestamp = errors[0].timestamp;
    expect(timestamp).toBeDefined();
    expect(timestamp >= beforeTime && timestamp <= afterTime).toBe(true);
  });

  it('returns empty summary when no errors', () => {
    const summary = logger.getSummary();
    expect(Object.keys(summary)).toHaveLength(0);
  });

  it('returns empty array for non-existent operation', () => {
    logger.log('op-a', 'error');
    const errors = logger.getErrorsForOperation('op-b');
    expect(errors).toHaveLength(0);
  });

  it('creates correct log file format', () => {
    logger.log('test-op', 'Test error', 'https://test.com');
    logger.save();

    const errors = logger.getErrors();
    expect(errors[0].operation).toBe('test-op');
    expect(errors[0].error).toBe('Test error');
    expect(errors[0].url).toBe('https://test.com');
    expect(errors[0].timestamp).toBeDefined();
  });
});
