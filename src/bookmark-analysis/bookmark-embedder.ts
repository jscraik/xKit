/**
 * BookmarkEmbedder - Generate embeddings using local Ollama
 *
 * Uses Ollama to create vector representations of bookmarks
 * for semantic similarity search and clustering.
 */

/**
 * Embedding result for a single bookmark
 */
export interface EmbeddingResult {
  /** Bookmark ID */
  bookmarkId: string;
  /** Vector embedding (float array) */
  embedding: number[];
  /** Model used for embedding */
  model: string;
  /** When this embedding was created */
  timestamp: number;
}

/**
 * Configuration for the embedder
 */
export interface EmbedderConfig {
  /** Ollama model to use for embeddings */
  model?: string;
  /** Custom Ollama host path */
  host?: string;
  /** Maximum concurrent embedding requests */
  maxConcurrent?: number;
}

/**
 * Embedding statistics
 */
export interface EmbedderStats {
  totalEmbedded: number;
  totalTokens: number;
  averageTime: number;
  lastEmbedded?: Date;
}

/**
 * Result of embedding batch operation
 */
export interface EmbedBatchResult {
  successful: EmbeddingResult[];
  failed: Array<{ id: string; error: string }>;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

/**
 * BookmarkEmbedder generates semantic embeddings for bookmarks
 * using local Ollama models like nomic-embed-text.
 *
 * These embeddings enable:
 * - Semantic search (find by meaning, not keywords)
 * - Similar bookmarks detection
 * - Automatic clustering
 * - Duplicate detection
 */
export class BookmarkEmbedder {
  private config: Required<EmbedderConfig>;
  private stats: EmbedderStats = {
    totalEmbedded: 0,
    totalTokens: 0,
    averageTime: 0,
  };

  constructor(config: EmbedderConfig = {}) {
    this.config = {
      model: config.model || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      host: config.host || process.env.OLLAMA_HOST || 'http://localhost:11434',
      maxConcurrent: config.maxConcurrent || 1,
    };
  }

  /**
   * Generate embedding for a single bookmark
   */
  async embedBookmark(bookmark: {
    id: string;
    text: string;
    authorUsername?: string;
  }): Promise<EmbeddingResult> {
    const startTime = Date.now();
    const content = this.combineContent(bookmark);

    try {
      const response = await fetch(`${this.config.host}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: content,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { embedding?: number[] };

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid response from Ollama: missing embedding array');
      }

      // Update stats
      const duration = Date.now() - startTime;
      this.stats.totalEmbedded++;
      this.stats.averageTime =
        (this.stats.averageTime * (this.stats.totalEmbedded - 1) + duration) /
        this.stats.totalEmbedded;
      this.stats.lastEmbedded = new Date();

      return {
        bookmarkId: bookmark.id,
        embedding: data.embedding,
        model: this.config.model,
        timestamp: Date.now(),
      };
    } catch (error) {
      throw new Error(
        `Ollama embedding failed (${this.config.host}/${this.config.model}): ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate embeddings for multiple bookmarks with error recovery
   *
   * Continues processing even if individual bookmarks fail.
   * Returns detailed results including success/failure counts.
   */
  async embedBatch(
    bookmarks: Array<{
      id: string;
      text: string;
      authorUsername?: string;
    }>,
    onProgress?: (current: number, total: number) => void
  ): Promise<EmbedBatchResult> {
    const successful: EmbeddingResult[] = [];
    const failed: Array<{ id: string; error: string }> = [];

    for (let i = 0; i < bookmarks.length; i++) {
      const bookmark = bookmarks[i];

      try {
        const result = await this.embedBookmark(bookmark);
        successful.push(result);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        failed.push({ id: bookmark.id, error: errorMsg });

        // Log the failure but continue processing
        console.warn(`⚠️  Failed to embed bookmark ${bookmark.id}: ${errorMsg.substring(0, 100)}`);
      }

      onProgress?.(i + 1, bookmarks.length);

      // Small delay to avoid overwhelming Ollama
      if (i < bookmarks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return {
      successful,
      failed,
      totalCount: bookmarks.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  /**
   * Check if Ollama embedding service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.host}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get embedding statistics
   */
  getStats(): EmbedderStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalEmbedded: 0,
      totalTokens: 0,
      averageTime: 0,
    };
  }

  /**
   * Combine bookmark text with metadata for richer embeddings
   */
  private combineContent(bookmark: {
    text: string;
    authorUsername?: string;
  }): string {
    const parts: string[] = [];
    const MAX_TEXT_LENGTH = 1000; // Truncate very long texts to avoid Ollama errors

    // Main text content (sanitized and truncated)
    if (bookmark.text) {
      const sanitized = this.sanitizeText(bookmark.text);
      const text = sanitized.length > MAX_TEXT_LENGTH
        ? sanitized.substring(0, MAX_TEXT_LENGTH) + '...'
        : sanitized;
      parts.push(text);
    }

    // Author context (helps with finding similar tweets from same author)
    if (bookmark.authorUsername) {
      parts.push(`by @${bookmark.authorUsername}`);
    }

    return parts.join(' ').trim();
  }

  /**
   * Sanitize text by removing sensitive patterns that cause Ollama errors
   *
   * Removes:
   * - API keys (sk-xxx, Bearer tokens, etc.)
   * - Passwords and secrets
   * - Binary/encoded data
   * - Excess whitespace
   */
  private sanitizeText(text: string): string {
    let sanitized = text;

    // Remove API keys and tokens (common patterns)
    // - OpenAI/Anthropic: sk-ant-, sk-, sk-
    // - Bearer tokens
    // - JWT tokens (long alphanumeric strings with dots)
    const sensitivePatterns = [
      // OpenAI/Anthropic API keys
      /sk-[a-zA-Z0-9]{20,}/g,
      /sk-ant-[a-zA-Z0-9]{20,}/g,
      // Bearer tokens
      /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
      // Generic token-like patterns (40+ alphanumeric characters)
      /\b[a-zA-Z0-9]{40,}\b/g,
      // JWT-like patterns (three dot-separated segments)
      /\b[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\b/g,
      // Password keywords followed by potential values
      /password["\s:=]+[^\s"]{8,}/gi,
      /secret["\s:=]+[^\s"]{8,}/gi,
      /api[_-]?key["\s:=]+[^\s"]{8,}/gi,
      /token["\s:=]+[^\s"]{8,}/gi,
      // JSON/XML with key-like structures
      /\{["\s]*["\s]*(?:api[_-]?key|secret|token|password)["\s]*["\s]*:\s*["\s]*[^"\s]{8,}["\s]*\}/gi,
    ];

    for (const pattern of sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    // Remove excessive whitespace and newlines
    sanitized = sanitized.replace(/\s+/g, ' ');
    sanitized = sanitized.trim();

    // If text is now too short after sanitization, return a placeholder
    if (sanitized.length < 10) {
      return '[Bookmark content redacted for security]';
    }

    return sanitized;
  }
}
