/**
 * URL validation utilities tests
 * Security-focused test suite for URL and ID validation
 */

import { describe, it, expect } from 'vitest';
import { validateUrlProtocol, validateXArticleId } from '../../src/security/sanitizer';

describe('validateUrlProtocol', () => {
  describe('accepts safe protocols', () => {
    it('accepts https URLs', () => {
      expect(validateUrlProtocol('https://example.com')).toBe(true);
      expect(validateUrlProtocol('https://api.example.com/v1/resource')).toBe(true);
      expect(validateUrlProtocol('https://subdomain.example.co.uk/path?query=value')).toBe(true);
    });

    it('accepts http URLs', () => {
      expect(validateUrlProtocol('http://example.com')).toBe(true);
      expect(validateUrlProtocol('http://localhost:3000')).toBe(true);
      expect(validateUrlProtocol('http://192.168.1.1/api')).toBe(true);
    });

    it('handles valid edge cases', () => {
      expect(validateUrlProtocol('https://example.com:443')).toBe(true);
      expect(validateUrlProtocol('http://example.com:80/path')).toBe(true);
      expect(validateUrlProtocol('https://example.com/path_with_underscore')).toBe(true);
      expect(validateUrlProtocol('https://example.com/path-with-dashes')).toBe(true);
    });
  });

  describe('rejects dangerous protocols', () => {
    it('rejects file:// protocol', () => {
      expect(validateUrlProtocol('file:///etc/passwd')).toBe(false);
      expect(validateUrlProtocol('file://localhost/etc/passwd')).toBe(false);
      expect(validateUrlProtocol('file:///Users/test/file.txt')).toBe(false);
    });

    it('rejects javascript: protocol', () => {
      expect(validateUrlProtocol('javascript:alert(1)')).toBe(false);
      expect(validateUrlProtocol('javascript:void(0)')).toBe(false);
      expect(validateUrlProtocol('javascript:document.cookie')).toBe(false);
    });

    it('rejects data: protocol', () => {
      expect(validateUrlProtocol('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(validateUrlProtocol('data:image/png;base64,iVBORw0KG...')).toBe(false);
    });

    it('rejects other dangerous protocols', () => {
      expect(validateUrlProtocol('ftp://example.com')).toBe(false);
      expect(validateUrlProtocol('mailto:test@example.com')).toBe(false);
      expect(validateUrlProtocol('tel:+1234567890')).toBe(false);
      expect(validateUrlProtocol('ws://example.com')).toBe(false);
      expect(validateUrlProtocol('wss://example.com')).toBe(false);
    });
  });

  describe('rejects invalid URLs', () => {
    it('rejects malformed URLs', () => {
      expect(validateUrlProtocol('not-a-url')).toBe(false);
      expect(validateUrlProtocol('htp://example.com')).toBe(false);
      expect(validateUrlProtocol('https:/example.com')).toBe(false);
      expect(validateUrlProtocol('://example.com')).toBe(false);
    });

    it('rejects empty and whitespace', () => {
      expect(validateUrlProtocol('')).toBe(false);
      expect(validateUrlProtocol('   ')).toBe(false);
      expect(validateUrlProtocol('\t\n')).toBe(false);
    });

    it('rejects URLs without protocol', () => {
      expect(validateUrlProtocol('example.com')).toBe(false);
      expect(validateUrlProtocol('www.example.com')).toBe(false);
      expect(validateUrlProtocol('//example.com')).toBe(false);
    });

    it('rejects edge case attacks', () => {
      expect(validateUrlProtocol('https\n://example.com')).toBe(false);
      expect(validateUrlProtocol('https\r://example.com')).toBe(false);
      expect(validateUrlProtocol('https\t://example.com')).toBe(false);
      expect(validateUrlProtocol('https://example.com<script>')).toBe(false);
    });
  });
});

describe('validateXArticleId', () => {
  describe('accepts valid numeric IDs', () => {
    it('accepts single digit IDs', () => {
      expect(validateXArticleId('1')).toBe(true);
      expect(validateXArticleId('0')).toBe(true);
      expect(validateXArticleId('9')).toBe(true);
    });

    it('accepts multi-digit IDs', () => {
      expect(validateXArticleId('123')).toBe(true);
      expect(validateXArticleId('1234567890')).toBe(true);
      expect(validateXArticleId('12345678901234567890')).toBe(true);
    });

    it('accepts Snowflake-style IDs (large numbers)', () => {
      expect(validateXArticleId('1234567890123456789')).toBe(true);
      expect(validateXArticleId('9999999999999999999')).toBe(true);
      expect(validateXArticleId('1000000000000000000')).toBe(true);
    });

    it('handles numeric edge cases', () => {
      expect(validateXArticleId('000123')).toBe(true);
      expect(validateXArticleId('1')).toBe(true);
      expect(validateXArticleId('0')).toBe(true);
    });
  });

  describe('rejects non-numeric input', () => {
    it('rejects alphabetic characters', () => {
      expect(validateXArticleId('abc')).toBe(false);
      expect(validateXArticleId('test123')).toBe(false);
      expect(validateXArticleId('123abc')).toBe(false);
      expect(validateXArticleId('a1b2c3')).toBe(false);
    });

    it('rejects special characters', () => {
      expect(validateXArticleId('123-456')).toBe(false);
      expect(validateXArticleId('123_456')).toBe(false);
      expect(validateXArticleId('123.456')).toBe(false);
      expect(validateXArticleId('123,456')).toBe(false);
      expect(validateXArticleId('123+456')).toBe(false);
      expect(validateXArticleId('123=456')).toBe(false);
    });

    it('rejects whitespace', () => {
      expect(validateXArticleId('123 456')).toBe(false);
      expect(validateXArticleId(' 123')).toBe(false);
      expect(validateXArticleId('123 ')).toBe(false);
      expect(validateXArticleId('\t123')).toBe(false);
      expect(validateXArticleId('123\n')).toBe(false);
    });

    it('rejects URL encoding attempts', () => {
      expect(validateXArticleId('%20')).toBe(false);
      expect(validateXArticleId('123%20abc')).toBe(false);
      expect(validateXArticleId('\x00')).toBe(false);
    });

    it('rejects injection attempts', () => {
      expect(validateXArticleId("1'; DROP TABLE--")).toBe(false);
      expect(validateXArticleId('1 OR 1=1')).toBe(false);
      expect(validateXArticleId('<script>alert(1)</script>')).toBe(false);
      expect(validateXArticleId('$(whoami)')).toBe(false);
    });
  });

  describe('rejects edge cases', () => {
    it('rejects empty string', () => {
      expect(validateXArticleId('')).toBe(false);
    });

    it('rejects whitespace only', () => {
      expect(validateXArticleId('   ')).toBe(false);
      expect(validateXArticleId('\t\n')).toBe(false);
    });

    it('rejects special characters only', () => {
      expect(validateXArticleId('-')).toBe(false);
      expect(validateXArticleId('_')).toBe(false);
      expect(validateXArticleId('.')).toBe(false);
      expect(validateXArticleId('!')).toBe(false);
    });

    it('rejects null-like values', () => {
      expect(validateXArticleId('null')).toBe(false);
      expect(validateXArticleId('undefined')).toBe(false);
      expect(validateXArticleId('NaN')).toBe(false);
    });

    it('rejects mixed alphanumeric', () => {
      expect(validateXArticleId('0x123')).toBe(false);
      expect(validateXArticleId('1e10')).toBe(false);
      expect(validateXArticleId('123abc456')).toBe(false);
    });
  });

  describe('handles type coercion', () => {
    it('converts numbers to strings', () => {
      expect(validateXArticleId(123 as any)).toBe(true);
      expect(validateXArticleId(0 as any)).toBe(true);
      expect(validateXArticleId(1234567890 as any)).toBe(true);
    });

    it('handles non-string types safely', () => {
      expect(validateXArticleId(null as any)).toBe(false);
      expect(validateXArticleId(undefined as any)).toBe(false);
      expect(validateXArticleId({} as any)).toBe(false);
      expect(validateXArticleId([] as any)).toBe(false);
    });
  });
});
