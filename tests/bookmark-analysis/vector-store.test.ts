/**
 * Tests for VectorStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VectorStore } from '../../src/bookmark-analysis/vector-store.js';

describe('VectorStore', () => {
  let store: VectorStore;

  beforeEach(() => {
    store = new VectorStore();
  });

  describe('basic operations', () => {
    it('should add and retrieve embeddings', () => {
      const embedding = [0.1, 0.2, 0.3];
      store.add('bookmark-1', embedding);

      expect(store.get('bookmark-1')).toEqual(embedding);
      expect(store.has('bookmark-1')).toBe(true);
      expect(store.size).toBe(1);
    });

    it('should add multiple embeddings via addBatch', () => {
      const results = [
        { bookmarkId: 'bookmark-1', embedding: [0.1, 0.2, 0.3], model: 'test-model', timestamp: Date.now() },
        { bookmarkId: 'bookmark-2', embedding: [0.4, 0.5, 0.6], model: 'test-model', timestamp: Date.now() },
      ];

      store.addBatch(results);

      expect(store.size).toBe(2);
      expect(store.has('bookmark-1')).toBe(true);
      expect(store.has('bookmark-2')).toBe(true);
    });

    it('should delete embeddings', () => {
      store.add('bookmark-1', [0.1, 0.2, 0.3]);
      expect(store.has('bookmark-1')).toBe(true);

      const deleted = store.delete('bookmark-1');
      expect(deleted).toBe(true);
      expect(store.has('bookmark-1')).toBe(false);
    });

    it('should clear all embeddings', () => {
      store.add('bookmark-1', [0.1, 0.2, 0.3]);
      store.add('bookmark-2', [0.4, 0.5, 0.6]);
      expect(store.size).toBe(2);

      store.clear();
      expect(store.size).toBe(0);
    });
  });

  describe('similarity search', () => {
    beforeEach(() => {
      // Add some test embeddings
      store.add('bookmark-1', [1, 0, 0]); // x-axis
      store.add('bookmark-2', [0, 1, 0]); // y-axis
      store.add('bookmark-3', [0.9, 0, 0]); // similar to bookmark-1
      store.add('bookmark-4', [0, 0.9, 0]); // similar to bookmark-2
      store.add('bookmark-5', [-1, 0, 0]); // opposite to bookmark-1
    });

    it('should find similar bookmarks', () => {
      const similar = store.findSimilar('bookmark-1', {
        minSimilarity: 0.7,
      });

      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].bookmarkId).toBe('bookmark-3'); // Most similar
      // [1,0,0] and [0.9,0,0] have cosine similarity = 1 (same direction)
      expect(similar[0].similarity).toBeCloseTo(1, 2);
    });

    it('should respect limit option', () => {
      const similar = store.findSimilar('bookmark-1', {
        limit: 2,
        minSimilarity: 0.5,
      });

      expect(similar.length).toBeLessThanOrEqual(2);
    });

    it('should exclude specified IDs', () => {
      const similar = store.findSimilar('bookmark-1', {
        excludeIds: new Set(['bookmark-3']),
        minSimilarity: 0.5,
      });

      expect(similar.find(s => s.bookmarkId === 'bookmark-3')).toBeUndefined();
    });

    it('should return empty array for unknown bookmark', () => {
      const similar = store.findSimilar('unknown', {
        minSimilarity: 0.5,
      });

      expect(similar).toEqual([]);
    });
  });

  describe('findSimilarToEmbedding', () => {
    beforeEach(() => {
      store.add('bookmark-1', [1, 0, 0]);
      store.add('bookmark-2', [0, 1, 0]);
      store.add('bookmark-3', [0.9, 0, 0]);
    });

    it('should find similar to raw embedding vector', () => {
      const queryEmbedding = [1, 0, 0];
      const similar = store.findSimilarToEmbedding(queryEmbedding, {
        minSimilarity: 0.5,
      });

      expect(similar.length).toBeGreaterThan(0);
      // bookmark-1 should be most similar (identical)
      expect(similar[0].bookmarkId).toBe('bookmark-1');
      expect(similar[0].similarity).toBe(1);
    });
  });

  describe('cosine similarity', () => {
    // Clear store before each test in this block
    beforeEach(() => {
      store.clear();
    });

    it('should calculate similarity correctly', () => {
      // Identical vectors = 1
      store.add('a', [1, 0, 0]);
      store.add('b', [1, 0, 0]);

      const similar = store.findSimilar('a', { limit: 1, minSimilarity: 0 });
      expect(similar[0].similarity).toBe(1);
    });

    it('should handle orthogonal vectors', () => {
      // Perpendicular vectors = 0
      store.add('a', [1, 0, 0]);
      store.add('b', [0, 1, 0]);

      const similar = store.findSimilar('a', { limit: 1, minSimilarity: 0 });
      expect(similar[0].similarity).toBe(0);
    });

    it('should handle opposite vectors', () => {
      // Opposite vectors = -1
      store.add('a', [1, 0, 0]);
      store.add('b', [-1, 0, 0]);

      const similar = store.findSimilar('a', { limit: 1, minSimilarity: -1 });
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].bookmarkId).toBe('b');
      expect(similar[0].similarity).toBe(-1);
    });
  });

  describe('stats', () => {
    it('should provide accurate stats', () => {
      store.add('bookmark-1', [0.1, 0.2, 0.3]);
      store.add('bookmark-2', [0.4, 0.5, 0.6]);

      const stats = store.getStats();

      expect(stats.totalEmbeddings).toBe(2);
      expect(stats.dimensions).toBe(3);
      expect(stats.memoryBytes).toBe(2 * 3 * 4); // 2 embeddings * 3 dims * 4 bytes
    });

    it('should return zero dimensions when empty', () => {
      const stats = store.getStats();

      expect(stats.totalEmbeddings).toBe(0);
      expect(stats.dimensions).toBe(0);
      expect(stats.memoryBytes).toBe(0);
    });
  });

  describe('metadata', () => {
    it('should store and retrieve metadata', () => {
      const timestamp = Date.now();
      store.add('bookmark-1', [0.1, 0.2, 0.3], {
        timestamp,
        model: 'test-model',
      });

      const metadata = store.getMetadata('bookmark-1');
      expect(metadata).toEqual({
        timestamp,
        model: 'test-model',
      });
    });

    it('should return undefined for missing metadata', () => {
      const metadata = store.getMetadata('unknown');
      expect(metadata).toBeUndefined();
    });
  });

  describe('keys', () => {
    it('should return all bookmark IDs', () => {
      store.add('bookmark-1', [0.1, 0.2, 0.3]);
      store.add('bookmark-2', [0.4, 0.5, 0.6]);
      store.add('bookmark-3', [0.7, 0.8, 0.9]);

      const keys = store.keys();

      expect(keys).toHaveLength(3);
      expect(keys).toContain('bookmark-1');
      expect(keys).toContain('bookmark-2');
      expect(keys).toContain('bookmark-3');
    });
  });
});
