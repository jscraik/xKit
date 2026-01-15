import { describe, expect, it } from 'vitest';
import { parseIntegerOption } from '../src/cli/shared.js';

describe('cli shared', () => {
  describe('parseIntegerOption', () => {
    it('parses integers (happy path)', () => {
      const res = parseIntegerOption('10', { name: '--count', min: 1 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe(10);
      }
    });

    it('trims whitespace before parsing', () => {
      const res = parseIntegerOption('  7  ', { name: '--count', min: 1 });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.value).toBe(7);
      }
    });

    it('rejects non-integer strings with a clear error', () => {
      const res = parseIntegerOption('nope', { name: '--count', min: 1 });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe('Invalid --count. Expected an integer >= 1.');
      }
    });

    it('rejects values below the minimum', () => {
      const res = parseIntegerOption('0', { name: '--count', min: 1 });
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toBe('Invalid --count. Expected an integer >= 1.');
      }
    });
  });
});
