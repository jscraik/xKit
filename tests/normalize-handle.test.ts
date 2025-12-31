import { describe, expect, it } from 'vitest';
import { mentionsQueryFromUserOption, normalizeHandle } from '../src/lib/normalize-handle.js';

const INVALID_HANDLE_REGEX = /Invalid --user handle/;

describe('normalizeHandle', () => {
  it('accepts bare handle', () => {
    expect(normalizeHandle('steipete')).toBe('steipete');
  });

  it('accepts @handle and trims whitespace', () => {
    expect(normalizeHandle('  @steipete  ')).toBe('steipete');
  });

  it('rejects empty input', () => {
    expect(normalizeHandle('')).toBeNull();
    expect(normalizeHandle('   ')).toBeNull();
    expect(normalizeHandle(null)).toBeNull();
  });

  it('rejects invalid characters and too-long handles', () => {
    expect(normalizeHandle('@stei-pete')).toBeNull();
    expect(normalizeHandle('@steipete!')).toBeNull();
    expect(normalizeHandle('a'.repeat(16))).toBeNull();
  });
});

describe('mentionsQueryFromUserOption', () => {
  it('returns null query when option omitted', () => {
    expect(mentionsQueryFromUserOption(undefined)).toEqual({ query: null, error: null });
  });

  it('returns normalized @query for valid handle', () => {
    expect(mentionsQueryFromUserOption('@steipete')).toEqual({ query: '@steipete', error: null });
    expect(mentionsQueryFromUserOption(' steipete ')).toEqual({ query: '@steipete', error: null });
  });

  it('returns error for invalid handle', () => {
    const result = mentionsQueryFromUserOption('@stei-pete');
    expect(result.query).toBeNull();
    expect(result.error).toMatch(INVALID_HANDLE_REGEX);
  });
});
