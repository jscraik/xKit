import { describe, expect, it } from 'vitest';
import {
  deduplicateByKey,
  deduplicateByProperty,
  findDuplicates,
  groupByKey,
  getDeduplicationStats,
} from '../../../src/commands/shared/deduplication.js';

interface TestItem {
  id: string;
  name: string;
  value: number;
}

describe('deduplication utilities', () => {
  const testItems: TestItem[] = [
    { id: '1', name: 'Item 1', value: 100 },
    { id: '2', name: 'Item 2', value: 200 },
    { id: '1', name: 'Item 1 Duplicate', value: 150 }, // Duplicate id
    { id: '3', name: 'Item 3', value: 300 },
    { id: '2', name: 'Item 2 Another', value: 250 }, // Duplicate id
  ];

  describe('deduplicateByKey', () => {
    it('removes duplicates based on key function', () => {
      const unique = deduplicateByKey(testItems, (item) => item.id);
      expect(unique).toHaveLength(3);
      expect(unique.map((u) => u.id)).toEqual(['1', '2', '3']);
    });

    it('keeps first occurrence of each key', () => {
      const unique = deduplicateByKey(testItems, (item) => item.id);
      const firstItem = unique.find((u) => u.id === '1');
      expect(firstItem?.name).toBe('Item 1');
      expect(firstItem?.value).toBe(100);
    });

    it('handles empty array', () => {
      const unique = deduplicateByKey([], (item) => item.id);
      expect(unique).toHaveLength(0);
    });

    it('handles array with no duplicates', () => {
      const noDupes = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
        { id: '3', name: 'C' },
      ] as TestItem[];
      const unique = deduplicateByKey(noDupes, (item) => item.id);
      expect(unique).toHaveLength(3);
    });

    it('works with complex key functions', () => {
      const items = [
        { id: '1', name: 'Alice', value: 10 },
        { id: '2', name: 'alice', value: 20 }, // Lowercase version
      ] as TestItem[];
      const unique = deduplicateByKey(items, (item) => item.name.toLowerCase());
      expect(unique).toHaveLength(1);
      expect(unique[0].id).toBe('1');
    });

    it('handles numeric keys', () => {
      const items = [
        { id: 'a', name: 'A', value: 1 },
        { id: 'b', name: 'B', value: 1 },
        { id: 'c', name: 'C', value: 2 },
      ] as TestItem[];
      const unique = deduplicateByKey(items, (item) => item.value);
      expect(unique).toHaveLength(2);
      expect(unique.map((u) => u.value)).toEqual([1, 2]);
    });
  });

  describe('deduplicateByProperty', () => {
    it('removes duplicates based on property name', () => {
      const unique = deduplicateByProperty(testItems, 'id');
      expect(unique).toHaveLength(3);
      expect(unique.map((u) => u.id)).toEqual(['1', '2', '3']);
    });

    it('keeps first occurrence of each property value', () => {
      const unique = deduplicateByProperty(testItems, 'id');
      const firstItem = unique.find((u) => u.id === '2');
      expect(firstItem?.name).toBe('Item 2');
      expect(firstItem?.value).toBe(200);
    });

    it('converts property values to strings', () => {
      const items = [
        { id: 1, name: 'A' },
        { id: '1', name: 'B' },
        { id: 2, name: 'C' },
      ] as unknown as TestItem[];
      const unique = deduplicateByProperty(items, 'id');
      // String '1' and number 1 are considered duplicates
      expect(unique).toHaveLength(2);
    });

    it('handles empty array', () => {
      const unique = deduplicateByProperty([], 'id');
      expect(unique).toHaveLength(0);
    });
  });

  describe('findDuplicates', () => {
    it('finds all duplicate items', () => {
      const duplicates = findDuplicates(testItems, (item) => item.id);
      expect(duplicates).toHaveLength(2);
      expect(duplicates[0].name).toBe('Item 1 Duplicate');
      expect(duplicates[1].name).toBe('Item 2 Another');
    });

    it('returns empty array when no duplicates', () => {
      const noDupes = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
        { id: '3', name: 'C' },
      ] as TestItem[];
      const duplicates = findDuplicates(noDupes, (item) => item.id);
      expect(duplicates).toHaveLength(0);
    });

    it('handles empty array', () => {
      const duplicates = findDuplicates([], (item) => item.id);
      expect(duplicates).toHaveLength(0);
    });

    it('finds all occurrences after the first', () => {
      const items = [
        { id: '1', name: 'First' },
        { id: '1', name: 'Second' },
        { id: '1', name: 'Third' },
        { id: '2', name: 'Fourth' },
      ] as TestItem[];
      const duplicates = findDuplicates(items, (item) => item.id);
      expect(duplicates).toHaveLength(2);
      expect(duplicates[0].name).toBe('Second');
      expect(duplicates[1].name).toBe('Third');
    });
  });

  describe('groupByKey', () => {
    it('groups items by key function', () => {
      const groups = groupByKey(testItems, (item) => item.id);
      expect(groups.size).toBe(3);
      expect(groups.get('1')).toHaveLength(2);
      expect(groups.get('2')).toHaveLength(2);
      expect(groups.get('3')).toHaveLength(1);
    });

    it('maintains original order within groups', () => {
      const groups = groupByKey(testItems, (item) => item.id);
      const group1 = groups.get('1')!;
      expect(group1[0].name).toBe('Item 1');
      expect(group1[1].name).toBe('Item 1 Duplicate');
    });

    it('handles empty array', () => {
      const groups = groupByKey([], (item) => item.id);
      expect(groups.size).toBe(0);
    });

    it('creates separate groups for different keys', () => {
      const items = [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
        { id: 'c', name: 'C' },
      ] as TestItem[];
      const groups = groupByKey(items, (item) => item.id);
      expect(groups.size).toBe(3);
      expect(groups.get('a')).toHaveLength(1);
      expect(groups.get('b')).toHaveLength(1);
      expect(groups.get('c')).toHaveLength(1);
    });

    it('handles complex key functions', () => {
      const items = [
        { id: '1', name: 'Apple', value: 1 },
        { id: '2', name: 'apricot', value: 1 },
        { id: '3', name: 'Banana', value: 2 },
      ] as TestItem[];
      const groups = groupByKey(items, (item) => item.name[0].toLowerCase());
      expect(groups.size).toBe(2);
      expect(groups.get('a')).toHaveLength(2);
      expect(groups.get('b')).toHaveLength(1);
    });
  });

  describe('getDeduplicationStats', () => {
    it('calculates correct statistics', () => {
      const unique = deduplicateByKey(testItems, (item) => item.id);
      const stats = getDeduplicationStats(testItems, unique);
      expect(stats.originalCount).toBe(5);
      expect(stats.uniqueCount).toBe(3);
      expect(stats.duplicateCount).toBe(2);
      expect(stats.deduplicationRate).toBeCloseTo(0.4, 1);
    });

    it('handles zero original items', () => {
      const stats = getDeduplicationStats([], []);
      expect(stats.originalCount).toBe(0);
      expect(stats.uniqueCount).toBe(0);
      expect(stats.duplicateCount).toBe(0);
      expect(stats.deduplicationRate).toBe(0);
    });

    it('handles no duplicates case', () => {
      const noDupes = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ] as TestItem[];
      const stats = getDeduplicationStats(noDupes, noDupes);
      expect(stats.originalCount).toBe(2);
      expect(stats.uniqueCount).toBe(2);
      expect(stats.duplicateCount).toBe(0);
      expect(stats.deduplicationRate).toBe(0);
    });

    it('handles all duplicates case', () => {
      const items = [
        { id: '1', name: 'A' },
        { id: '1', name: 'A2' },
        { id: '1', name: 'A3' },
      ] as TestItem[];
      const unique = deduplicateByKey(items, (item) => item.id);
      const stats = getDeduplicationStats(items, unique);
      expect(stats.originalCount).toBe(3);
      expect(stats.uniqueCount).toBe(1);
      expect(stats.duplicateCount).toBe(2);
      expect(stats.deduplicationRate).toBeCloseTo(0.667, 2);
    });
  });
});
