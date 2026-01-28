/**
 * MediaDownloader unit tests
 * Tests for media downloading with retry logic, validation, and security
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Mock the https module BEFORE importing MediaDownloader
vi.mock('node:https', () => ({
  default: {
    get: vi.fn(),
  },
  get: vi.fn(),
}));

// Mock logger to avoid noise in tests
vi.mock('../../src/observability/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import * as https from 'node:https';
import { MediaDownloader } from '../../src/bookmark-media/media-downloader.js';

const mockGet = vi.mocked(https.get);

describe('MediaDownloader', () => {
  let downloader: MediaDownloader;
  const testDir = '/tmp/xkit-media-test';

  beforeEach(() => {
    downloader = new MediaDownloader({
      maxConcurrent: 2,
      maxRetries: 3,
      initialDelay: 100,
      maxDelay: 500,
      requestTimeout: 5000,
    });
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test files
    if (existsSync(testDir)) {
      try {
        await unlink(testDir + '/test-image.jpg').catch(() => {});
        await unlink(testDir + '/test-video.mp4').catch(() => {});
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('downloadImage', () => {
    it('should successfully download an image with valid URL', async () => {
      const mockImageData = Buffer.from('fake-image-data');

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': mockImageData.length.toString(),
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        // Simulate data event
        setTimeout(() => {
          const dataCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'data'
          )?.[1];
          if (dataCallback) {
            dataCallback(mockImageData);
          }

          const endCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'end'
          )?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 10);

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const targetPath = `${testDir}/test-image.jpg`;
      const result = await downloader.downloadImage('https://example.com/image.jpg', targetPath);

      expect(result.success).toBe(true);
      expect(result.targetPath).toBe(targetPath);
      expect(result.bytesDownloaded).toBeGreaterThan(0);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.error).toBeUndefined();
    });

    it('should validate content type and return error for non-image', async () => {
      const mockData = Buffer.from('fake-video-data');

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'video/mp4',
            'content-length': mockData.length.toString(),
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        setTimeout(() => {
          const dataCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'data'
          )?.[1];
          if (dataCallback) {
            dataCallback(mockData);
          }

          const endCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'end'
          )?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 10);

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const targetPath = `${testDir}/test-image.jpg`;
      const result = await downloader.downloadImage('https://example.com/video.mp4', targetPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid content type for image');
      expect(result.contentType).toBe('video/mp4');
    });

    it('should reject invalid URL protocols', async () => {
      const targetPath = `${testDir}/test-image.jpg`;
      const result = await downloader.downloadImage('file:///etc/passwd', targetPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid URL protocol');
    });

    it('should reject non-absolute paths', async () => {
      const result = await downloader.downloadImage('https://example.com/image.jpg', 'relative/path.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toContain('targetPath must be an absolute path');
    });
  });

  describe('downloadVideo', () => {
    it('should successfully download a video with valid URL', async () => {
      const mockVideoData = Buffer.from('fake-video-data');

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'video/mp4',
            'content-length': mockVideoData.length.toString(),
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        setTimeout(() => {
          const dataCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'data'
          )?.[1];
          if (dataCallback) {
            dataCallback(mockVideoData);
          }

          const endCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'end'
          )?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 10);

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const targetPath = `${testDir}/test-video.mp4`;
      const result = await downloader.downloadVideo('https://example.com/video.mp4', targetPath);

      expect(result.success).toBe(true);
      expect(result.targetPath).toBe(targetPath);
      expect(result.bytesDownloaded).toBeGreaterThan(0);
      expect(result.contentType).toBe('video/mp4');
      expect(result.error).toBeUndefined();
    });

    it('should validate content type and return error for non-video', async () => {
      const mockData = Buffer.from('fake-image-data');

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': mockData.length.toString(),
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        setTimeout(() => {
          const dataCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'data'
          )?.[1];
          if (dataCallback) {
            dataCallback(mockData);
          }

          const endCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'end'
          )?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 10);

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const targetPath = `${testDir}/test-video.mp4`;
      const result = await downloader.downloadVideo('https://example.com/image.jpg', targetPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid content type for video');
      expect(result.contentType).toBe('image/jpeg');
    });
  });

  describe('retry logic', () => {
    it('should retry on retryable errors', async () => {
      let attemptCount = 0;

      mockGet.mockImplementation((url, callback) => {
        attemptCount++;

        if (attemptCount < 3) {
          // First two attempts fail with timeout
          const req = {
            on: vi.fn(),
            destroy: vi.fn(),
            setTimeout: vi.fn((_, handler) => {
              setTimeout(handler, 10);
            }),
          } as any;

          // Trigger timeout error
          setTimeout(() => {
            const errorHandler = req.on.mock.calls.find((call: any[]) => call[0] === 'error')?.[1];
            if (errorHandler) {
              errorHandler(new Error('ETIMEDOUT'));
            }
          }, 15);

          return req;
        } else {
          // Third attempt succeeds
          const mockData = Buffer.from('success');
          const mockResponse = {
            statusCode: 200,
            headers: {
              'content-type': 'image/jpeg',
              'content-length': mockData.length.toString(),
            },
            on: vi.fn(),
            pipe: vi.fn(),
          } as any;

          setTimeout(() => {
            const dataCallback = (mockResponse.on as any).mock.calls.find(
              (call: any[]) => call[0] === 'data'
            )?.[1];
            if (dataCallback) {
              dataCallback(mockData);
            }

            const endCallback = (mockResponse.on as any).mock.calls.find(
              (call: any[]) => call[0] === 'end'
            )?.[1];
            if (endCallback) {
              endCallback();
            }
          }, 10);

          callback(mockResponse);
          return { on: vi.fn(), destroy: vi.fn() } as any;
        }
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage('https://example.com/image.jpg', `${testDir}/test.jpg`);

      expect(attemptCount).toBe(3);
      expect(result.success).toBe(true);
    });

    it('should not retry on non-retryable errors', async () => {
      let attemptCount = 0;

      mockGet.mockImplementation(() => {
        attemptCount++;

        const req = {
          on: vi.fn(),
          destroy: vi.fn(),
          setTimeout: vi.fn(),
        } as any;

        // Trigger a non-retryable error immediately
        setTimeout(() => {
          const errorHandler = req.on.mock.calls.find((call: any[]) => call[0] === 'error')?.[1];
          if (errorHandler) {
            errorHandler(new Error('EACCES: permission denied'));
          }
        }, 10);

        return req;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage('https://example.com/image.jpg', `${testDir}/test.jpg`);

      expect(attemptCount).toBe(1);
      expect(result.success).toBe(false);
      expect(result.error).toContain('EACCES');
    });

    it('should exhaust retries and return failure', async () => {
      mockGet.mockImplementation(() => {
        const req = {
          on: vi.fn(),
          destroy: vi.fn(),
          setTimeout: vi.fn((_, handler) => {
            setTimeout(handler, 10);
          }),
        } as any;

        // Always timeout
        setTimeout(() => {
          const errorHandler = req.on.mock.calls.find((call: any[]) => call[0] === 'error')?.[1];
          if (errorHandler) {
            errorHandler(new Error('ETIMEDOUT'));
          }
        }, 15);

        return req;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage('https://example.com/image.jpg', `${testDir}/test.jpg`);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ETIMEDOUT');
    });
  });

  describe('file type validation', () => {
    it('should accept allowed image extensions', async () => {
      const mockData = Buffer.from('fake-image');

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': mockData.length.toString(),
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        setTimeout(() => {
          const dataCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'data'
          )?.[1];
          if (dataCallback) {
            dataCallback(mockData);
          }

          const endCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'end'
          )?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 10);

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });

      const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      for (const ext of extensions) {
        const result = await downloader.downloadImage(
          `https://example.com/image.${ext}`,
          `${testDir}/test.${ext}`
        );
        expect(result.success).toBe(true);
      }
    });

    it('should accept allowed video extensions', async () => {
      const mockData = Buffer.from('fake-video');

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'video/mp4',
            'content-length': mockData.length.toString(),
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        setTimeout(() => {
          const dataCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'data'
          )?.[1];
          if (dataCallback) {
            dataCallback(mockData);
          }

          const endCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'end'
          )?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 10);

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadVideo('https://example.com/video.mp4', `${testDir}/test.mp4`);

      expect(result.success).toBe(true);
    });

    it('should reject disallowed file extensions', async () => {
      const mockData = Buffer.from('fake-executable');

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'application/octet-stream',
            'content-length': mockData.length.toString(),
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        setTimeout(() => {
          const dataCallback = (mockResponse.on as any).mock.calls.find(
            (call: any[]) => call[0] === 'data'
          )?.[1];
          if (dataCallback) {
            dataCallback(mockData);
          }

          const endCallback = (mockResponse.on as any).mockCalls.find(
            (call: any[]) => call[0] === 'end'
          )?.[1];
          if (endCallback) {
            endCallback();
          }
        }, 10);

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage(
        'https://example.com/file.exe',
        `${testDir}/test.exe`
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Disallowed file extension');
    });
  });

  describe('size limits', () => {
    it('should reject oversized images', async () => {
      const oversizedLength = (11 * 1024 * 1024).toString(); // 11MB

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': oversizedLength,
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage('https://example.com/huge.jpg', `${testDir}/huge.jpg`);

      expect(result.success).toBe(false);
      expect(result.error).toContain('File size');
      expect(result.error).toContain('exceeds limit');
    });

    it('should reject oversized videos', async () => {
      const oversizedLength = (51 * 1024 * 1024).toString(); // 51MB

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'video/mp4',
            'content-length': oversizedLength,
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadVideo(
        'https://example.com/huge.mp4',
        `${testDir}/huge.mp4`
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('File size');
      expect(result.error).toContain('exceeds limit');
    });

    it('should accept images within size limit', async () => {
      const validLength = (5 * 1024 * 1024).toString(); // 5MB

      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 200,
          headers: {
            'content-type': 'image/jpeg',
            'content-length': validLength,
          },
          on: vi.fn(),
          pipe: vi.fn(),
        } as any;

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage(
        'https://example.com/normal.jpg',
        `${testDir}/normal.jpg`
      );

      expect(result.success).toBe(true);
    });
  });

  describe('URL hash filename generation', () => {
    it('should generate consistent hash for same URL', () => {
      const url = 'https://example.com/image.jpg';
      const filename1 = downloader.generateFilename(url, 'jpg');
      const filename2 = downloader.generateFilename(url, 'jpg');

      expect(filename1).toBe(filename2);
      expect(filename1).toMatch(/^[a-f0-9]{12}\.jpg$/);
    });

    it('should generate different hashes for different URLs', () => {
      const filename1 = downloader.generateFilename('https://example.com/image1.jpg', 'jpg');
      const filename2 = downloader.generateFilename('https://example.com/image2.jpg', 'jpg');

      expect(filename1).not.toBe(filename2);
    });

    it('should generate hash with query parameters', () => {
      const url1 = 'https://example.com/image.jpg?size=large';
      const url2 = 'https://example.com/image.jpg?size=small';
      const filename1 = downloader.generateFilename(url1, 'jpg');
      const filename2 = downloader.generateFilename(url2, 'jpg');

      // Different URLs (including query params) should produce different hashes
      expect(filename1).not.toBe(filename2);
    });

    it('should preserve extension in filename', () => {
      const extensions = ['jpg', 'png', 'gif', 'mp4', 'webp'];

      for (const ext of extensions) {
        const filename = downloader.generateFilename('https://example.com/file', ext);
        expect(filename).endsWith(`.${ext}`);
        expect(filename).toMatch(/^[a-f0-9]{12}\.[a-z]+$/);
      }
    });
  });

  describe('graceful degradation', () => {
    it('should return DownloadResult on network errors', async () => {
      mockGet.mockImplementationOnce(() => {
        const req = {
          on: vi.fn(),
          destroy: vi.fn(),
          setTimeout: vi.fn(),
        } as any;

        setTimeout(() => {
          const errorHandler = req.on.mock.calls.find((call: any[]) => call[0] === 'error')?.[1];
          if (errorHandler) {
            errorHandler(new Error('ECONNREFUSED'));
          }
        }, 10);

        return req;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage(
        'https://unreachable.example.com/image.jpg',
        `${testDir}/test.jpg`
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.targetPath).toBeDefined();
      expect(result.bytesDownloaded).toBe(0);
    });

    it('should return DownloadResult on HTTP errors', async () => {
      mockGet.mockImplementationOnce((url, callback) => {
        const mockResponse = {
          statusCode: 404,
          statusMessage: 'Not Found',
          headers: {},
          on: vi.fn(),
        } as any;

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage(
        'https://example.com/missing.jpg',
        `${testDir}/test.jpg`
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('404');
    });

    it('should return DownloadResult on timeout', async () => {
      mockGet.mockImplementationOnce(() => {
        const req = {
          on: vi.fn(),
          destroy: vi.fn(),
          setTimeout: vi.fn((_, handler) => {
            setTimeout(handler, 10);
          }),
        } as any;

        setTimeout(() => {
          // Simulate timeout by calling error handler
          const errorHandler = req.on.mock.calls.find((call: any[]) => call[0] === 'error')?.[1];
          if (errorHandler) {
            errorHandler(new Error('Request timeout after 5000ms'));
          }
        }, 15);

        return req;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage(
        'https://slow.example.com/image.jpg',
        `${testDir}/test.jpg`
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should never throw exceptions from public methods', async () => {
      // Test that all errors are caught and returned as DownloadResult
      const invalidUrl = 'not-a-valid-url';

      await mkdir(testDir, { recursive: true });

      const result = await downloader.downloadImage(invalidUrl, `${testDir}/test.jpg`);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should use default config when no config provided', () => {
      const defaultDownloader = new MediaDownloader();
      const config = defaultDownloader.getConfig();

      expect(config.maxConcurrent).toBe(3);
      expect(config.maxRetries).toBe(3);
      expect(config.initialDelay).toBe(1000);
      expect(config.maxDelay).toBe(10000);
      expect(config.requestTimeout).toBe(30000);
    });

    it('should use custom config when provided', () => {
      const customDownloader = new MediaDownloader({
        maxConcurrent: 5,
        maxRetries: 5,
        initialDelay: 500,
        maxDelay: 2000,
        requestTimeout: 10000,
      });
      const config = customDownloader.getConfig();

      expect(config.maxConcurrent).toBe(5);
      expect(config.maxRetries).toBe(5);
      expect(config.initialDelay).toBe(500);
      expect(config.maxDelay).toBe(2000);
      expect(config.requestTimeout).toBe(10000);
    });

    it('should provide queue stats', () => {
      const stats = downloader.getQueueStats();

      expect(stats).toBeDefined();
      expect(typeof stats.activeCount).toBe('number');
      expect(typeof stats.pendingCount).toBe('number');
    });
  });

  describe('redirect handling', () => {
    it('should follow redirects', async () => {
      let redirectCount = 0;

      mockGet.mockImplementation((url, callback) => {
        redirectCount++;

        if (redirectCount === 1) {
          // First request returns redirect
          const mockResponse = {
            statusCode: 302,
            headers: {
              location: 'https://final.example.com/image.jpg',
            },
            on: vi.fn(),
          } as any;

          callback(mockResponse);
          return { on: vi.fn(), destroy: vi.fn() } as any;
        } else {
          // Second request (to final URL) succeeds
          const mockData = Buffer.from('final-image');
          const mockResponse = {
            statusCode: 200,
            headers: {
              'content-type': 'image/jpeg',
              'content-length': mockData.length.toString(),
            },
            on: vi.fn(),
            pipe: vi.fn(),
          } as any;

          setTimeout(() => {
            const dataCallback = (mockResponse.on as any).mock.calls.find(
              (call: any[]) => call[0] === 'data'
            )?.[1];
            if (dataCallback) {
              dataCallback(mockData);
            }

            const endCallback = (mockResponse.on as any).mock.calls.find(
              (call: any[]) => call[0] === 'end'
            )?.[1];
            if (endCallback) {
              endCallback();
            }
          }, 10);

          callback(mockResponse);
          return { on: vi.fn(), destroy: vi.fn() } as any;
        }
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage(
        'https://redirect.example.com/image.jpg',
        `${testDir}/test.jpg`
      );

      expect(redirectCount).toBe(2);
      expect(result.success).toBe(true);
    });

    it('should reject too many redirects', async () => {
      mockGet.mockImplementation((url, callback) => {
        // Always return redirect
        const mockResponse = {
          statusCode: 302,
          headers: {
            location: 'https://redirect.example.com/next',
          },
          on: vi.fn(),
        } as any;

        callback(mockResponse);
        return { on: vi.fn(), destroy: vi.fn() } as any;
      });

      await mkdir(testDir, { recursive: true });
      const result = await downloader.downloadImage(
        'https://redirect.example.com/start',
        `${testDir}/test.jpg`
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Too many redirects');
    });
  });
});
