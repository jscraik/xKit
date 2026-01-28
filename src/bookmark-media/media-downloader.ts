/**
 * Media Downloader - Downloads media files from Twitter/X URLs
 * Handles images and videos with retry logic and validation
 */

import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import * as https from 'node:https';
import { dirname, isAbsolute } from 'node:path';
import type { Readable } from 'node:stream';
import pLimit from 'p-limit';
import { logger } from '../observability/logger.js';
import { validateUrlProtocol } from '../security/sanitizer.js';

/**
 * Regex for extracting file extension from URL
 */
const EXTENSION_REGEX = /\.([a-z0-9]+)(?:\?|$)/i;

/**
 * Allowed file extensions for media downloads
 */
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webp']);

/**
 * Size limits in bytes
 */
const SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 50 * 1024 * 1024, // 50MB
} as const;

/**
 * Media type from URL
 */
function getMediaType(url: string): 'image' | 'video' | 'unknown' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('/photo/') || lowerUrl.includes('/media/')) {
    return 'image';
  }
  if (lowerUrl.includes('/video/') || lowerUrl.includes('.mp4') || lowerUrl.includes('/tweet/video/')) {
    return 'video';
  }
  return 'unknown';
}

/**
 * Extract file extension from URL or Content-Type header
 */
function extractExtension(url: string, contentType?: string): string {
  // Try URL extension first
  const urlMatch = url.match(EXTENSION_REGEX);
  if (urlMatch) {
    const ext = urlMatch[1].toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      return ext;
    }
  }

  // Fall back to Content-Type header
  if (contentType) {
    const typeMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
    };
    return typeMap[contentType.toLowerCase()] || 'bin';
  }

  return 'bin';
}

/**
 * Generate URL hash for deduplication
 * Uses SHA-256 hash of the URL for consistent, unique filenames
 */
function generateUrlHash(url: string): string {
  return createHash('sha256').update(url).digest('hex').substring(0, 12);
}

/**
 * Download result metadata
 */
export interface DownloadResult {
  success: boolean;
  targetPath: string;
  bytesDownloaded: number;
  contentType?: string;
  error?: string;
}

/**
 * MediaDownloader configuration
 */
export interface MediaDownloaderConfig {
  /** Maximum concurrent downloads */
  maxConcurrent?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Initial backoff delay in ms */
  initialDelay?: number;
  /** Maximum backoff delay in ms */
  maxDelay?: number;
  /** Request timeout in ms (default: 30000) */
  requestTimeout?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<MediaDownloaderConfig> = {
  maxConcurrent: 3,
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  requestTimeout: 30000,
};

/**
 * MediaDownloader - Downloads media files with retry logic
 *
 * Features:
 * - Concurrent download limiting with p-limit
 * - Exponential backoff retry strategy
 * - File type validation
 * - Size limits (10MB images, 50MB videos)
 * - URL-based deduplication via SHA-256 hash
 * - Graceful degradation (logs errors, never throws)
 *
 * @example
 * ```ts
 * const downloader = new MediaDownloader();
 * await downloader.downloadImage(url, '/path/to/image.jpg');
 * ```
 */
export class MediaDownloader {
  private config: Required<MediaDownloaderConfig>;
  private downloadQueue: ReturnType<typeof pLimit>;

  constructor(config: MediaDownloaderConfig = {}) {
    this.config = {
      maxConcurrent: config.maxConcurrent ?? DEFAULT_CONFIG.maxConcurrent,
      maxRetries: config.maxRetries ?? DEFAULT_CONFIG.maxRetries,
      initialDelay: config.initialDelay ?? DEFAULT_CONFIG.initialDelay,
      maxDelay: config.maxDelay ?? DEFAULT_CONFIG.maxDelay,
      requestTimeout: config.requestTimeout ?? DEFAULT_CONFIG.requestTimeout,
    };

    // Initialize download queue for concurrency control
    this.downloadQueue = pLimit(this.config.maxConcurrent);
  }

  /**
   * Download an image from URL
   *
   * Validates file type and size before downloading.
   * Uses retry logic with exponential backoff.
   *
   * @param url - Image URL
   * @param targetPath - Local file path to save image
   * @returns Promise resolving to download result
   */
  async downloadImage(url: string, targetPath: string): Promise<DownloadResult> {
    return this.downloadQueue(async () => {
      try {
        logger.debug({ url, targetPath }, 'Downloading image');
        const result = await this.downloadWithRetry(url, targetPath, this.config.maxRetries);

        // Validate it's actually an image
        if (result.contentType && !result.contentType.startsWith('image/')) {
          const error = `Invalid content type for image: ${result.contentType}`;
          logger.warn({ url, contentType: result.contentType }, error);
          return {
            success: false,
            targetPath,
            bytesDownloaded: result.bytesDownloaded,
            contentType: result.contentType,
            error,
          };
        }

        logger.info({ url, targetPath, bytes: result.bytesDownloaded }, 'Image downloaded successfully');
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ url, targetPath, error: message }, 'Image download failed');
        return {
          success: false,
          targetPath,
          bytesDownloaded: 0,
          error: message,
        };
      }
    });
  }

  /**
   * Download a video from URL
   *
   * Validates file type and size before downloading.
   * Uses retry logic with exponential backoff.
   *
   * @param url - Video URL
   * @param targetPath - Local file path to save video
   * @returns Promise resolving to download result
   */
  async downloadVideo(url: string, targetPath: string): Promise<DownloadResult> {
    return this.downloadQueue(async () => {
      try {
        logger.debug({ url, targetPath }, 'Downloading video');
        const result = await this.downloadWithRetry(url, targetPath, this.config.maxRetries);

        // Validate it's actually a video
        if (result.contentType && !result.contentType.startsWith('video/')) {
          const error = `Invalid content type for video: ${result.contentType}`;
          logger.warn({ url, contentType: result.contentType }, error);
          return {
            success: false,
            targetPath,
            bytesDownloaded: result.bytesDownloaded,
            contentType: result.contentType,
            error,
          };
        }

        logger.info({ url, targetPath, bytes: result.bytesDownloaded }, 'Video downloaded successfully');
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ url, targetPath, error: message }, 'Video download failed');
        return {
          success: false,
          targetPath,
          bytesDownloaded: 0,
          error: message,
        };
      }
    });
  }

  /**
   * Download with retry logic and exponential backoff
   *
   * Implements the core download logic with retry strategy:
   * - Retries on network errors and 5xx responses
   * - Exponential backoff: delay = initialDelay * (2 ^ attempt)
   * - Respects maxDelay ceiling
   * - Validates file type and size limits
   * - Validates URL protocol and target path security
   *
   * @param url - Media URL to download
   * @param targetPath - Local file path to save
   * @param maxRetries - Maximum retry attempts (default: 3)
   * @returns Promise resolving to download result
   */
  private async downloadWithRetry(url: string, targetPath: string, maxRetries: number): Promise<DownloadResult> {
    // Validate URL protocol (http/https only)
    if (!validateUrlProtocol(url)) {
      return {
        success: false,
        targetPath,
        bytesDownloaded: 0,
        error: 'Invalid URL protocol: only http:// and https:// are allowed',
      };
    }

    // Validate targetPath is absolute (basic path traversal protection)
    if (!isAbsolute(targetPath)) {
      return {
        success: false,
        targetPath,
        bytesDownloaded: 0,
        error: 'targetPath must be an absolute path',
      };
    }

    let lastError: Error | undefined;
    let totalBytes = 0;
    let contentType: string | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Ensure directory exists
        await mkdir(dirname(targetPath), { recursive: true });

        // Perform the download
        const result = await this.downloadHttps(url, targetPath);
        totalBytes = result.bytesDownloaded;
        contentType = result.contentType;

        // Validate file extension
        const ext = extractExtension(url, contentType);
        if (!ALLOWED_EXTENSIONS.has(ext)) {
          throw new Error(`Disallowed file extension: ${ext}`);
        }

        return {
          success: true,
          targetPath,
          bytesDownloaded: totalBytes,
          contentType,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = lastError.message.toLowerCase();

        // Check if error is retryable
        const isRetryable =
          attempt < maxRetries &&
          (errorMessage.includes('econnrefused') ||
            errorMessage.includes('enotfound') ||
            errorMessage.includes('etimedout') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('500') ||
            errorMessage.includes('502') ||
            errorMessage.includes('503') ||
            errorMessage.includes('504'));

        if (!isRetryable) {
          break;
        }

        // Calculate backoff delay
        const delay = Math.min(this.config.initialDelay * 2 ** (attempt - 1), this.config.maxDelay);

        logger.debug(
          { url, attempt, maxRetries, delay, error: lastError.message },
          'Download attempt failed, retrying with backoff',
        );

        // Wait before retry
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    return {
      success: false,
      targetPath,
      bytesDownloaded: totalBytes,
      contentType,
      error: lastError?.message ?? 'Unknown error',
    };
  }

  /**
   * Perform HTTPS download using native Node.js https module
   *
   * Downloads file to targetPath with size limit validation.
   * Streams data to avoid loading entire file into memory.
   * Tracks redirect depth to prevent redirect loops.
   *
   * @param url - HTTPS URL to download
   * @param targetPath - Local file path to save
   * @param redirectDepth - Current redirect depth (default: 0)
   * @param maxRedirects - Maximum redirect limit (default: 5)
   * @returns Promise resolving to bytes downloaded and content type
   * @throws Error if download fails, exceeds size limit, or has too many redirects
   */
  private async downloadHttps(
    url: string,
    targetPath: string,
    redirectDepth: number = 0,
    maxRedirects: number = 5,
  ): Promise<{
    bytesDownloaded: number;
    contentType?: string;
  }> {
    // Check redirect depth to prevent redirect loops
    if (redirectDepth > maxRedirects) {
      throw new Error(`Too many redirects (max: ${maxRedirects})`);
    }

    // Validate URL protocol on each redirect
    if (!validateUrlProtocol(url)) {
      throw new Error('Invalid URL protocol: only http:// and https:// are allowed');
    }

    return new Promise((resolve, reject) => {
      let bytesDownloaded = 0;
      let contentType: string | undefined;

      const request = https.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (!redirectUrl) {
            reject(new Error('Redirect without location header'));
            return;
          }

          // Follow redirect with incremented depth
          this.downloadHttps(redirectUrl, targetPath, redirectDepth + 1, maxRedirects)
            .then(resolve)
            .catch(reject);
          return;
        }

        // Handle errors
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        // Get content type
        contentType = response.headers['content-type'];

        // Determine size limit based on media type
        const mediaType = getMediaType(url);
        const sizeLimit = mediaType === 'video' ? SIZE_LIMITS.video : SIZE_LIMITS.image;

        // Get content length if available
        const contentLength = response.headers['content-length'];
        if (contentLength) {
          const size = parseInt(contentLength, 10);
          if (size > sizeLimit) {
            reject(new Error(`File size (${size} bytes) exceeds limit (${sizeLimit} bytes)`));
            return;
          }
        }

        // Create write stream
        const fileStream = createWriteStream(targetPath);

        // Pipe response to file with size tracking
        const stream = response as Readable;
        stream.on('data', (chunk: Buffer) => {
          bytesDownloaded += chunk.length;

          // Check size limit during download
          if (bytesDownloaded > sizeLimit) {
            stream.destroy();
            fileStream.destroy();
            // Clean up partial file
            unlink(targetPath).catch((err) => {
              logger.debug(
                { error: err instanceof Error ? err.message : String(err) },
                'Failed to clean up partial file',
              );
            });
            reject(new Error(`File size exceeds limit (${sizeLimit} bytes)`));
          }
        });

        stream.on('error', async (error) => {
          fileStream.destroy();
          // Clean up partial file on stream error
          try {
            await unlink(targetPath);
          } catch {
            // Ignore cleanup errors
          }
          reject(error);
        });

        fileStream.on('error', async (error) => {
          stream.destroy();
          // Clean up partial file on file stream error
          try {
            await unlink(targetPath);
          } catch {
            // Ignore cleanup errors
          }
          reject(error);
        });

        fileStream.on('finish', () => {
          resolve({ bytesDownloaded, contentType });
        });

        stream.pipe(fileStream);
      });

      request.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      request.setTimeout(this.config.requestTimeout, () => {
        request.destroy();
        reject(new Error(`Request timeout after ${this.config.requestTimeout}ms`));
      });
    });
  }

  /**
   * Sleep for specified milliseconds
   *
   * Used for exponential backoff between retry attempts.
   *
   * @param ms - Milliseconds to sleep
   * @returns Promise that resolves after delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique filename from URL for deduplication
   *
   * Uses SHA-256 hash of URL to ensure consistent filenames
   * across multiple downloads of the same media.
   *
   * @param url - Media URL
   * @param extension - File extension (e.g., 'jpg', 'mp4')
   * @returns Unique filename (e.g., 'a1b2c3d4e5f6.jpg')
   *
   * @example
   * ```ts
   * const filename = downloader.generateFilename(url, 'jpg');
   * // Returns: 'a1b2c3d4e5f6.jpg'
   * ```
   */
  generateFilename(url: string, extension: string): string {
    const hash = generateUrlHash(url);
    return `${hash}.${extension}`;
  }

  /**
   * Get current configuration
   *
   * @returns Current downloader configuration
   */
  getConfig(): Readonly<Required<MediaDownloaderConfig>> {
    return { ...this.config };
  }

  /**
   * Get current queue statistics
   *
   * @returns Object with activeCount and pendingCount
   */
  getQueueStats(): { activeCount: number; pendingCount: number } {
    return {
      activeCount: this.downloadQueue.activeCount,
      pendingCount: this.downloadQueue.pendingCount,
    };
  }
}
