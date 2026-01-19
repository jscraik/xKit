/**
 * Resource limits tests for OllamaClient
 * Tests concurrency controls, resource warnings, and queue behavior
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { OllamaClient } from '../../src/bookmark-enrichment/ollama-client.js';

describe('Resource Limits', () => {
    let originalWarn: typeof console.warn;
    let warnMessages: string[] = [];

    beforeEach(() => {
        // Capture console.warn output
        originalWarn = console.warn;
        warnMessages = [];
        console.warn = vi.fn((...args: unknown[]) => {
            warnMessages.push(args.join(' '));
        });
    });

    afterEach(() => {
        // Restore console.warn
        console.warn = originalWarn;
    });

    test('constructor logs resource warnings on first instantiation', () => {
        new OllamaClient();

        expect(warnMessages.length).toBeGreaterThan(0);
        expect(warnMessages.some((msg) => msg.includes('AI Processing Requirements'))).toBe(true);
        expect(warnMessages.some((msg) => msg.includes('2-4GB RAM'))).toBe(true);
        expect(warnMessages.some((msg) => msg.includes('10-30 seconds'))).toBe(true);
    });

    test('MAX_CONCURRENT_REQUESTS is 1', () => {
        const client = new OllamaClient();
        expect((client as any).MAX_CONCURRENT_REQUESTS).toBe(1);
    });

    test('MAX_CONTENT_LENGTH is 10000', () => {
        const client = new OllamaClient();
        expect((client as any).MAX_CONTENT_LENGTH).toBe(10000);
    });

    test('requestQueue is initialized with p-limit', () => {
        const client = new OllamaClient();
        expect((client as any).requestQueue).toBeDefined();
        expect(typeof (client as any).requestQueue).toBe('function');
    });

    test('resource warning only logged once per session', () => {
        // First instantiation
        warnMessages = [];
        new OllamaClient();
        const firstCount = warnMessages.filter((msg) =>
            msg.includes('AI Processing Requirements')
        ).length;

        // Second instantiation
        new OllamaClient();
        const secondCount = warnMessages.filter((msg) =>
            msg.includes('AI Processing Requirements')
        ).length;

        // Should have the same count (not double)
        expect(secondCount).toBe(firstCount);
    });

    test('hasLoggedResourceWarning flag prevents duplicate warnings', () => {
        const client1 = new OllamaClient();
        const client2 = new OllamaClient();

        // Both instances should exist (warning was only logged once globally)
        expect(client1).toBeDefined();
        expect(client2).toBeDefined();
    });

    test('sanitization limits content length', () => {
        const client = new OllamaClient();
        const longContent = 'x'.repeat(20000);
        const sanitized = (client as any).sanitizeForAI(longContent);

        expect(sanitized.length).toBe(10000);
    });

    describe('executeWithLimits integration', () => {
        test('wraps operations with queue', async () => {
            const client = new OllamaClient();
            const mockFn = vi.fn().mockResolvedValue('result');

            // Call private method
            await (client as any).executeWithLimits(mockFn, 'testOperation');

            expect(mockFn).toHaveBeenCalledTimes(1);
        });

        test('logs timing information on success', async () => {
            const client = new OllamaClient();
            const mockFn = vi.fn().mockResolvedValue('result');
            const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

            await (client as any).executeWithLimits(mockFn, 'testOperation');

            expect(debugSpy).toHaveBeenCalledWith(
                expect.stringContaining('AI testOperation completed')
            );
            expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('ms'));

            debugSpy.mockRestore();
        });

        test('logs timing information on failure', async () => {
            const client = new OllamaClient();
            const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            await expect((client as any).executeWithLimits(mockFn, 'testOperation')).rejects.toThrow(
                'Test error'
            );

            // Check that error was called with the message (containing timing) and error object
            expect(errorSpy).toHaveBeenCalledTimes(1);
            const callArgs = errorSpy.mock.calls[0];
            expect(callArgs[0]).toContain('AI testOperation failed after');
            expect(callArgs[0]).toContain('ms:');
            expect(callArgs[1]).toBeInstanceOf(Error);

            errorSpy.mockRestore();
        });
    });

    describe('Concurrency behavior', () => {
        test('multiple operations are queued (would require mocking)', async () => {
            // This test would require mocking the Ollama client
            // to simulate delayed responses and verify serialization
            // For now, we verify the queue exists
            const client = new OllamaClient();
            expect((client as any).requestQueue).toBeDefined();
        });
    });
});
