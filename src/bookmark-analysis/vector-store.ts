/**
 * VectorStore - In-memory vector similarity search
 *
 * Provides fast similarity search using cosine similarity.
 * Stores embeddings and finds the most similar bookmarks.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EmbeddingResult } from './bookmark-embedder.js';

/**
 * Similar bookmark result with similarity score
 */
export interface SimilarBookmark {
  bookmarkId: string;
  similarity: number; // 0-1 cosine similarity
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Maximum number of results */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  minSimilarity?: number;
  /** Exclude specific bookmark IDs from results */
  excludeIds?: Set<string>;
}

/**
 * VectorStore provides semantic similarity search for bookmark embeddings.
 *
 * Uses cosine similarity to find semantically similar bookmarks.
 * All operations are in-memory for fast access.
 */
export class VectorStore {
  private embeddings = new Map<string, number[]>();
  private metadata = new Map<string, { timestamp: number; model: string }>();

  /**
   * Get the number of stored embeddings
   */
  get size(): number {
    return this.embeddings.size;
  }

  /**
   * Add a single embedding to the store
   */
  add(bookmarkId: string, embedding: number[], metadata?: { timestamp: number; model: string }): void {
    this.embeddings.set(bookmarkId, embedding);
    if (metadata) {
      this.metadata.set(bookmarkId, metadata);
    }
  }

  /**
   * Add multiple embeddings from EmbeddingResult array
   */
  addBatch(results: EmbeddingResult[]): void {
    for (const result of results) {
      this.add(result.bookmarkId, result.embedding, {
        timestamp: result.timestamp,
        model: result.model,
      });
    }
  }

  /**
   * Get embedding for a specific bookmark
   */
  get(bookmarkId: string): number[] | undefined {
    return this.embeddings.get(bookmarkId);
  }

  /**
   * Remove an embedding from the store
   */
  delete(bookmarkId: string): boolean {
    this.metadata.delete(bookmarkId);
    return this.embeddings.delete(bookmarkId);
  }

  /**
   * Clear all embeddings
   */
  clear(): void {
    this.embeddings.clear();
    this.metadata.clear();
  }

  /**
   * Find bookmarks similar to a given bookmark
   */
  findSimilar(
    bookmarkId: string,
    options: SearchOptions = {}
  ): SimilarBookmark[] {
    const {
      limit = 10,
      minSimilarity = 0.7,
      excludeIds = new Set<string>(),
    } = options;

    const target = this.embeddings.get(bookmarkId);
    if (!target) {
      return [];
    }

    const similarities: SimilarBookmark[] = [];

    for (const [id, embedding] of this.embeddings) {
      // Skip self and excluded IDs
      if (id === bookmarkId || excludeIds.has(id)) {
        continue;
      }

      const similarity = this.cosineSimilarity(target, embedding);

      // Filter by minimum similarity
      if (similarity >= minSimilarity) {
        similarities.push({ bookmarkId: id, similarity });
      }
    }

    // Sort by similarity (descending) and limit results
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Find bookmarks similar to a raw embedding vector
   */
  findSimilarToEmbedding(
    embedding: number[],
    options: SearchOptions = {}
  ): SimilarBookmark[] {
    const {
      limit = 10,
      minSimilarity = 0.7,
      excludeIds = new Set<string>(),
    } = options;

    const similarities: SimilarBookmark[] = [];

    for (const [id, storedEmbedding] of this.embeddings) {
      if (excludeIds.has(id)) {
        continue;
      }

      const similarity = this.cosineSimilarity(embedding, storedEmbedding);

      if (similarity >= minSimilarity) {
        similarities.push({ bookmarkId: id, similarity });
      }
    }

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Calculate cosine similarity between two vectors
   *
   * Returns a value between -1 and 1, where:
   * - 1 = identical (same direction)
   * - 0 = orthogonal (unrelated)
   * * -1 = opposite (different meaning)
   *
   * For text embeddings, values are typically 0-1.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) {
      return 0;
    }

    return dotProduct / magnitude;
  }

  /**
   * Get all bookmark IDs in the store
   */
  keys(): string[] {
    return Array.from(this.embeddings.keys());
  }

  /**
   * Check if a bookmark ID exists in the store
   */
  has(bookmarkId: string): boolean {
    return this.embeddings.has(bookmarkId);
  }

  /**
   * Get metadata for a bookmark
   */
  getMetadata(bookmarkId: string): { timestamp: number; model: string } | undefined {
    return this.metadata.get(bookmarkId);
  }

  /**
   * Get statistics about the store
   */
  getStats() {
    const dimensions = this.embeddings.size > 0
      ? Array.from(this.embeddings.values())[0].length
      : 0;

    return {
      totalEmbeddings: this.embeddings.size,
      dimensions,
      memoryBytes: this.embeddings.size * dimensions * 4, // 4 bytes per float
    };
  }

  /**
   * Save embeddings to disk for persistence
   *
   * @param filepath - Path to save the embeddings file (JSON format)
   * @throws Error if file cannot be written
   */
  save(filepath: string): void {
    // Convert Maps to arrays for JSON serialization
    const data = {
      embeddings: Array.from(this.embeddings.entries()),
      metadata: Array.from(this.metadata.entries()),
      stats: this.getStats(),
      savedAt: new Date().toISOString(),
      version: '1.0',
    };

    // Ensure directory exists
    const dir = dirname(filepath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load embeddings from disk
   *
   * @param filepath - Path to load the embeddings file from
   * @returns true if loaded successfully, false if file doesn't exist
   * @throws Error if file exists but cannot be parsed
   */
  load(filepath: string): boolean {
    if (!existsSync(filepath)) {
      return false;
    }

    try {
      const content = readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content);

      // Validate data structure
      if (!data.embeddings || !Array.isArray(data.embeddings)) {
        throw new Error('Invalid embeddings file: missing embeddings array');
      }

      // Clear existing data
      this.embeddings.clear();
      this.metadata.clear();

      // Restore embeddings and metadata
      for (const [id, embedding] of data.embeddings) {
        this.embeddings.set(id, embedding as number[]);
      }

      if (data.metadata) {
        for (const [id, meta] of data.metadata) {
          this.metadata.set(id, meta as { timestamp: number; model: string });
        }
      }

      return true;
    } catch (error) {
      throw new Error(
        `Failed to load embeddings from ${filepath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get embeddings as EmbeddingResult array for export
   */
  toEmbeddingResults(): EmbeddingResult[] {
    const results: EmbeddingResult[] = [];

    for (const [id, embedding] of this.embeddings) {
      const meta = this.metadata.get(id);
      results.push({
        bookmarkId: id,
        embedding,
        model: meta?.model || 'unknown',
        timestamp: meta?.timestamp || Date.now(),
      });
    }

    return results;
  }
}
