/**
 * Tests for bookmark organization sanitization utilities.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeAuthorName, sanitizeSlug } from '../../src/bookmark-organization/sanitize';

describe('sanitizeAuthorName', () => {
  it('should return handle-only format when no real name provided', () => {
    expect(sanitizeAuthorName('doodlestein')).toBe('@doodlestein');
    expect(sanitizeAuthorName('@doodlestein')).toBe('@doodlestein');
  });

  it('should return handle with real name when provided', () => {
    expect(sanitizeAuthorName('doodlestein', 'Doug')).toBe('@doodlestein (Doug)');
    expect(sanitizeAuthorName('@doodlestein', 'Doug')).toBe('@doodlestein (Doug)');
  });

  it('should handle Unicode characters in real names', () => {
    expect(sanitizeAuthorName('user', 'José García')).toBe('@user (José García)');
    expect(sanitizeAuthorName('user', '大野 智')).toBe('@user (大野 智)');
  });

  it('should throw on reserved Windows names', () => {
    expect(() => sanitizeAuthorName('CON')).toThrow('Reserved Windows filename');
    expect(() => sanitizeAuthorName('PRN')).toThrow('Reserved Windows filename');
    expect(() => sanitizeAuthorName('AUX')).toThrow('Reserved Windows filename');
    expect(() => sanitizeAuthorName('NUL')).toThrow('Reserved Windows filename');
    expect(() => sanitizeAuthorName('COM1')).toThrow('Reserved Windows filename');
    expect(() => sanitizeAuthorName('LPT1')).toThrow('Reserved Windows filename');
  });

  it('should throw on invalid handle characters (non-ASCII)', () => {
    expect(() => sanitizeAuthorName('user-name')).toThrow('Invalid handle format');
    expect(() => sanitizeAuthorName('user.name')).toThrow('Invalid handle format');
    expect(() => sanitizeAuthorName('user name')).toThrow('Invalid handle format');
    expect(() => sanitizeAuthorName('user@name')).toThrow('Invalid handle format');
  });

  it('should throw on handles with dashes or dots', () => {
    expect(() => sanitizeAuthorName('user-name')).toThrow('Invalid handle format');
    expect(() => sanitizeAuthorName('user.name')).toThrow('Invalid handle format');
    expect(() => sanitizeAuthorName('@user-name')).toThrow('Invalid handle format');
    expect(() => sanitizeAuthorName('@user.name')).toThrow('Invalid handle format');
  });

  it('should remove control characters from real names', () => {
    expect(sanitizeAuthorName('user', 'Test\x00Name')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test\x1FName')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test\x7FName')).toBe('@user (TestName)');
  });

  it('should remove dangerous filesystem characters from real names', () => {
    expect(sanitizeAuthorName('user', 'Test<>Name')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test:"Name"')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test|Name')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test?Name')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test*Name')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test/Name')).toBe('@user (TestName)');
    expect(sanitizeAuthorName('user', 'Test\\Name')).toBe('@user (TestName)');
  });

  it('should remove leading/trailing dots and spaces from real names', () => {
    expect(sanitizeAuthorName('user', '  .Test Name.  ')).toBe('@user (Test Name)');
    expect(sanitizeAuthorName('user', '...Test Name...')).toBe('@user (Test Name)');
  });

  it('should collapse multiple spaces in real names', () => {
    expect(sanitizeAuthorName('user', 'Test    Name')).toBe('@user (Test Name)');
  });

  it('should truncate real names to MAX_REAL_NAME_LENGTH', () => {
    const MAX_REAL_NAME_LENGTH = 100; // Local constant, matches src
    const longName = 'A'.repeat(MAX_REAL_NAME_LENGTH + 50);
    const result = sanitizeAuthorName('user', longName);
    expect(result).toBe(`@user (${'A'.repeat(MAX_REAL_NAME_LENGTH)})`);
  });

  it('should handle empty real name after sanitization', () => {
    expect(sanitizeAuthorName('user', '   ')).toBe('@user');
    expect(sanitizeAuthorName('user', '...')).toBe('@user');
    expect(sanitizeAuthorName('user', '\x00\x01\x02')).toBe('@user');
  });
});

describe('sanitizeSlug', () => {
  it('should convert text to lowercase with hyphens', () => {
    expect(sanitizeSlug('Hello World')).toBe('hello-world');
    expect(sanitizeSlug('TestTitle')).toBe('testtitle');
  });

  it('should remove control characters', () => {
    expect(sanitizeSlug('Test\x00Title')).toBe('testtitle');
    expect(sanitizeSlug('Test\x1FTitle')).toBe('testtitle');
  });

  it('should normalize Unicode to NFC then remove non-alphanumerics', () => {
    // NFC normalization + remove non-alphanumerics
    // 'café' → 'café' (NFC) → 'caf-' (é replaced with hyphen) → 'caf' (trailing hyphen trimmed)
    const result = sanitizeSlug('café');
    expect(result).toBe('caf');
  });

  it('should replace non-alphanumerics with hyphens', () => {
    expect(sanitizeSlug('test_title')).toBe('test-title');
    expect(sanitizeSlug('test.title')).toBe('test-title');
    expect(sanitizeSlug('test@title')).toBe('test-title');
  });

  it('should throw on path traversal attempts', () => {
    expect(() => sanitizeSlug('../etc/passwd')).toThrow('Path traversal detected');
    expect(() => sanitizeSlug('..\\windows\\system32')).toThrow('Path traversal detected');
    expect(() => sanitizeSlug('./../../etc/passwd')).toThrow('Path traversal detected');
  });

  it('should remove leading/trailing hyphens', () => {
    expect(sanitizeSlug('---test---')).toBe('test');
    expect(sanitizeSlug('test---')).toBe('test');
    expect(sanitizeSlug('---test')).toBe('test');
  });

  it('should limit slug length to 80 characters', () => {
    const longSlug = 'a'.repeat(100);
    expect(sanitizeSlug(longSlug)).toHaveLength(80);
  });
});
