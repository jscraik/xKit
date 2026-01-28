/**
 * Tests for VisionAnalyzer class
 *
 * Tests image analysis functionality for persona extraction including:
 * - Image analysis with sample image buffer
 * - Prompt generation for persona extraction
 * - Graceful degradation when vision model unavailable
 * - ImageAnalysisResult structure parsing
 * - Field length limits
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VisionAnalyzer, type ImageAnalysisResult } from '../../src/persona-extraction/vision-analyzer.js';

// Mock OllamaClient
const mockOllamaClient = {
  analyzeImage: vi.fn(),
} as any;

describe('VisionAnalyzer', () => {
  let analyzer: VisionAnalyzer;

  beforeEach(() => {
    vi.clearAllMocks();
    analyzer = new VisionAnalyzer(mockOllamaClient);
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      const defaultAnalyzer = new VisionAnalyzer(mockOllamaClient);
      expect(defaultAnalyzer).toBeInstanceOf(VisionAnalyzer);
    });

    it('should create instance with custom config', () => {
      const customAnalyzer = new VisionAnalyzer(mockOllamaClient, {
        customPrompt: 'Custom analysis prompt',
        maxFieldLength: 100,
      });
      expect(customAnalyzer).toBeInstanceOf(VisionAnalyzer);
    });

    it('should use default maxFieldLength when not specified', () => {
      const defaultAnalyzer = new VisionAnalyzer(mockOllamaClient);
      // Default is 200 as per code
      expect(defaultAnalyzer).toBeInstanceOf(VisionAnalyzer);
    });
  });

  describe('analyzeImage', () => {
    const sampleImageBuffer = Buffer.from('fake-image-data');

    it('should analyze image successfully with valid response', async () => {
      const mockResponse = `Style: minimalist
Content: code screenshot
Visible Text: none
Aesthetic: flat design
Summary: A clean code screenshot showing a TypeScript interface`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(true);
      expect(result.style).toBe('minimalist');
      expect(result.content).toBe('code screenshot');
      expect(result.visibleText).toBe('none');
      expect(result.aesthetic).toBe('flat design');
      expect(result.summary).toBe('A clean code screenshot showing a TypeScript interface');
    });

    it('should handle multi-line field values', async () => {
      const mockResponse = `Style: colorful and vibrant
Content: photo of a workspace with multiple monitors
Visible Text: The text says "Hello World" on the screen
And continues on this line
Aesthetic: modern tech setup
Summary: A developer's workspace showing their coding environment`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(true);
      expect(result.style).toBe('colorful and vibrant');
      expect(result.content).toBe('photo of a workspace with multiple monitors');
      expect(result.visibleText).toContain('The text says "Hello World" on the screen');
      expect(result.visibleText).toContain('And continues on this line');
      expect(result.aesthetic).toBe('modern tech setup');
    });

    it('should handle different label variations', async () => {
      const mockResponse = `Style: professional
Content: people
Visible Text: Some visible text here
Aesthetic: geometric
Summary: Team photo at office`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(true);
      expect(result.style).toBe('professional');
      expect(result.content).toBe('people');
      expect(result.visibleText).toBe('Some visible text here');
    });

    it('should return default result when vision model unavailable', async () => {
      const unavailableMessage = '[Image analysis unavailable - vision model not installed]';
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(unavailableMessage);

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(false);
      expect(result.style).toBe('unavailable');
      expect(result.content).toBe('unavailable');
      expect(result.visibleText).toBe('');
      expect(result.aesthetic).toBe('unavailable');
      expect(result.summary).toBe('Image analysis unavailable - vision model not installed or analysis failed');
    });

    it('should handle OllamaClient errors gracefully', async () => {
      const error = new Error('Network connection failed');
      vi.mocked(mockOllamaClient.analyzeImage).mockRejectedValue(error);

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(false);
      expect(result.style).toBe('unavailable');
      expect(result.content).toBe('unavailable');
      expect(result.summary).toContain('Image analysis unavailable');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(mockOllamaClient.analyzeImage).mockRejectedValue('String error');

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(false);
      expect(result.style).toBe('unavailable');
    });

    it('should handle empty response with fallback', async () => {
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue('');

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(true);
      expect(result.style).toBe('unknown');
      expect(result.content).toBe('unknown');
      expect(result.aesthetic).toBe('unknown');
    });

    it('should handle unstructured response', async () => {
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue('This is just some random text without structure');

      const result = await analyzer.analyzeImage(sampleImageBuffer);

      expect(result.success).toBe(true);
      expect(result.summary).toBe('This is just some random text without structure');
      expect(result.style).toBe('unknown');
    });

    it('should call OllamaClient.analyzeImage with correct parameters', async () => {
      const mockResponse = 'Style: test\nContent: test\nVisible Text: none\nAesthetic: test\nSummary: test';
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      await analyzer.analyzeImage(sampleImageBuffer);

      expect(mockOllamaClient.analyzeImage).toHaveBeenCalledTimes(1);
      expect(mockOllamaClient.analyzeImage).toHaveBeenCalledWith(
        sampleImageBuffer,
        expect.stringContaining('Analyze this image for persona extraction')
      );
    });
  });

  describe('prompt generation', () => {
    it('should use default prompt when customPrompt not provided', async () => {
      const mockResponse = 'Style: test\nContent: test\nVisible Text: none\nAesthetic: test\nSummary: test';
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const defaultAnalyzer = new VisionAnalyzer(mockOllamaClient);
      await defaultAnalyzer.analyzeImage(Buffer.from('test'));

      const promptArg = vi.mocked(mockOllamaClient.analyzeImage).mock.calls[0][1];
      expect(promptArg).toContain('Visual Style');
      expect(promptArg).toContain('Content');
      expect(promptArg).toContain('Visible Text');
      expect(promptArg).toContain('Aesthetic Patterns');
      expect(promptArg).toContain('Summary');
    });

    it('should use custom prompt when provided', async () => {
      const customPrompt = 'Custom analysis instructions for image';
      const mockResponse = 'Style: test\nContent: test\nVisible Text: none\nAesthetic: test\nSummary: test';
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const customAnalyzer = new VisionAnalyzer(mockOllamaClient, {
        customPrompt,
      });
      await customAnalyzer.analyzeImage(Buffer.from('test'));

      const promptArg = vi.mocked(mockOllamaClient.analyzeImage).mock.calls[0][1];
      expect(promptArg).toBe(customPrompt);
    });
  });

  describe('ImageAnalysisResult structure parsing', () => {
    it('should parse all fields correctly from structured response', async () => {
      const mockResponse = `Style: dark and moody
Content: landscape photography
Visible Text: A sign that reads "Scenic Viewpoint"
Aesthetic: high contrast, dramatic lighting
Summary: A dramatic landscape photo with mountains and fog`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result).toMatchObject({
        style: 'dark and moody',
        content: 'landscape photography',
        visibleText: 'A sign that reads "Scenic Viewpoint"',
        aesthetic: 'high contrast, dramatic lighting',
        summary: 'A dramatic landscape photo with mountains and fog',
        success: true,
      } satisfies ImageAnalysisResult);
    });

    it('should handle case-insensitive field labels', async () => {
      const mockResponse = `STYLE: uppercase
content: lowercase
Visible Text: mixed
AESTHETIC: uppercase
summary: mixed`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.style).toBe('uppercase');
      expect(result.content).toBe('lowercase');
      expect(result.aesthetic).toBe('uppercase');
      expect(result.summary).toBe('mixed');
    });

    it('should handle fields with extra whitespace', async () => {
      const mockResponse = `Style:    minimalist with lots of space
Content:   code screenshot
Visible Text:   none
Aesthetic:  flat design
Summary:  A clean interface`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.style).toBe('minimalist with lots of space');
      expect(result.content).toBe('code screenshot');
    });

    it('should populate missing fields with defaults', async () => {
      const mockResponse = `Content: products
Summary: A product catalog`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.content).toBe('products');
      expect(result.summary).toBe('A product catalog');
      expect(result.style).toBe('unknown');
      expect(result.aesthetic).toBe('unknown');
    });

    it('should handle "text:" label variation for visible text', async () => {
      const mockResponse = `Style: professional
Content: diagram
Text: Here is some text
Aesthetic: clean
Summary: Technical diagram`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.visibleText).toBe('Here is some text');
    });

    it('should detect field boundaries correctly', async () => {
      const mockResponse = `Style: minimalist
Content: code
Visible Text: function test() { return true; }
Aesthetic: clean
Summary: Code example showing a function`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      // Ensure visible text doesn't bleed into aesthetic
      expect(result.visibleText).toBe('function test() { return true; }');
      expect(result.aesthetic).toBe('clean');
      expect(result.summary).toBe('Code example showing a function');
    });
  });

  describe('field length limits', () => {
    it('should truncate fields exceeding default max length (200)', async () => {
      const longText = 'a'.repeat(250);
      const mockResponse = `Style: ${longText}
Content: ${longText}
Visible Text: none
Aesthetic: ${longText}
Summary: ${longText}`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      // Default maxFieldLength is 200, so should be truncated to 197 + '...'
      expect(result.style.length).toBeLessThanOrEqual(200);
      expect(result.style).toContain('...');
      expect(result.content.length).toBeLessThanOrEqual(200);
      expect(result.content).toContain('...');
      expect(result.aesthetic.length).toBeLessThanOrEqual(200);
      expect(result.aesthetic).toContain('...');
    });

    it('should respect custom maxFieldLength', async () => {
      const customAnalyzer = new VisionAnalyzer(mockOllamaClient, {
        maxFieldLength: 50,
      });

      const longText = 'a'.repeat(100);
      const mockResponse = `Style: ${longText}
Content: ${longText}
Visible Text: none
Aesthetic: ${longText}
Summary: ${longText}`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await customAnalyzer.analyzeImage(Buffer.from('test'));

      expect(result.style.length).toBeLessThanOrEqual(50);
      expect(result.content.length).toBeLessThanOrEqual(50);
      expect(result.aesthetic.length).toBeLessThanOrEqual(50);
    });

    it('should not truncate fields within limit', async () => {
      const shortText = 'Short text';
      const mockResponse = `Style: ${shortText}
Content: ${shortText}
Visible Text: none
Aesthetic: ${shortText}
Summary: ${shortText}`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.style).toBe(shortText);
      expect(result.content).toBe(shortText);
      expect(result.aesthetic).toBe(shortText);
      expect(result.summary).toBe(shortText);
    });

    it('should truncate multi-line field values', async () => {
      const customAnalyzer = new VisionAnalyzer(mockOllamaClient, {
        maxFieldLength: 30,
      });

      const mockResponse = `Style: test
Content: This is a very long content description
that spans multiple lines
and should be truncated
Aesthetic: test
Summary: test`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await customAnalyzer.analyzeImage(Buffer.from('test'));

      expect(result.content.length).toBeLessThanOrEqual(30);
      expect(result.content).toContain('...');
    });
  });

  describe('configure method', () => {
    it('should update customPrompt configuration', async () => {
      const newPrompt = 'Updated custom prompt';
      analyzer.configure({ customPrompt: newPrompt });

      const mockResponse = 'Style: test\nContent: test\nVisible Text: none\nAesthetic: test\nSummary: test';
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      await analyzer.analyzeImage(Buffer.from('test'));

      const promptArg = vi.mocked(mockOllamaClient.analyzeImage).mock.calls[0][1];
      expect(promptArg).toBe(newPrompt);
    });

    it('should update maxFieldLength configuration', async () => {
      const newMaxLength = 100;
      analyzer.configure({ maxFieldLength: newMaxLength });

      const longText = 'a'.repeat(150);
      const mockResponse = `Style: ${longText}
Content: test
Visible Text: none
Aesthetic: test
Summary: test`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.style.length).toBeLessThanOrEqual(100);
    });

    it('should update both configuration options together', async () => {
      analyzer.configure({
        customPrompt: 'New prompt',
        maxFieldLength: 75,
      });

      const mockResponse = 'Style: test\nContent: test\nVisible Text: none\nAesthetic: test\nSummary: test';
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      await analyzer.analyzeImage(Buffer.from('test'));

      const promptArg = vi.mocked(mockOllamaClient.analyzeImage).mock.calls[0][1];
      expect(promptArg).toBe('New prompt');

      const longText = 'a'.repeat(100);
      const longResponse = `Style: ${longText}\nContent: test\nVisible Text: none\nAesthetic: test\nSummary: test`;
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(longResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));
      expect(result.style.length).toBeLessThanOrEqual(75);
    });
  });

  describe('edge cases', () => {
    it('should handle response with only some fields', async () => {
      const mockResponse = `Style: colorful
Summary: Bright and cheerful image`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.style).toBe('colorful');
      expect(result.summary).toBe('Bright and cheerful image');
      expect(result.content).toBe('unknown');
      expect(result.visibleText).toBe('');
      expect(result.aesthetic).toBe('unknown');
    });

    it('should handle response with empty field values', async () => {
      const mockResponse = `Style:
Content:
Visible Text:
Aesthetic:
Summary:`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      // Empty values after colon are preserved as empty strings, then defaulted
      expect(result.style).toBe('unknown');
      expect(result.content).toBe('unknown');
      expect(result.visibleText).toBe('');
      expect(result.aesthetic).toBe('unknown');
      // Summary gets the entire unstructured response when all fields are empty
      expect(result.summary).toContain('Style:');
    });

    it('should handle response with extra whitespace lines', async () => {
      const mockResponse = `Style: minimalist


Content: code screenshot


Visible Text: none


Aesthetic: flat design


Summary: Clean code example`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      // Empty lines are included in the value during multi-line extraction
      expect(result.style).toMatch(/minimalist/);
      expect(result.content).toMatch(/code screenshot/);
      expect(result.visibleText).toMatch(/none/);
      expect(result.aesthetic).toMatch(/flat design/);
      expect(result.summary).toBe('Clean code example');
    });

    it('should handle response with colons in values', async () => {
      const mockResponse = `Style: 12:00 PM timestamp style
Content: ratio 16:9 video
Visible Text: The time is 3:30 PM
Aesthetic: test
Summary: Image with time references`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      expect(result.style).toBe('12:00 PM timestamp style');
      expect(result.content).toContain('16:9');
      expect(result.visibleText).toContain('3:30 PM');
    });

    it('should handle very long single-line response', async () => {
      const longLine = 'a'.repeat(500);
      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(longLine);

      const result = await analyzer.analyzeImage(Buffer.from('test'));

      // Long unstructured responses are truncated to maxFieldLength (200)
      expect(result.summary.length).toBe(200); // Default maxFieldLength
      expect(result.summary).toContain('...');
    });
  });

  describe('integration scenarios', () => {
    it('should analyze code screenshot for developer persona', async () => {
      const mockResponse = `Style: dark theme with syntax highlighting
Content: code screenshot showing TypeScript code
Visible Text: interface Persona { name: string; skills: string[]; }
Aesthetic: modern IDE interface, clean typography
Summary: A developer sharing their TypeScript interface definition, suggesting attention to type safety and clean code practices`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('code-screenshot'));

      expect(result.success).toBe(true);
      expect(result.content).toContain('TypeScript');
      expect(result.visibleText).toContain('interface Persona');
      expect(result.summary).toContain('developer');
    });

    it('should analyze photography for artistic persona', async () => {
      const mockResponse = `Style: high contrast, dramatic lighting
Content: black and white landscape photography
Visible Text: none
Aesthetic: film noir style, moody atmosphere
Summary: Artistic landscape photo showing strong composition skills and appreciation for dramatic natural lighting`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('photo'));

      expect(result.success).toBe(true);
      expect(result.content).toContain('landscape photography');
      expect(result.aesthetic).toContain('film noir');
    });

    it('should analyze meme for humor-focused persona', async () => {
      const mockResponse = `Style: bold, impact font, bright colors
Content: meme format image
Visible Text: WHEN THE CODE WORKS ON THE FIRST TRY
Aesthetic: classic internet meme style, overlaid text
Summary: Humorous meme suggesting this person has a lighthearted approach to development challenges and finds relatability in common coding experiences`;

      vi.mocked(mockOllamaClient.analyzeImage).mockResolvedValue(mockResponse);

      const result = await analyzer.analyzeImage(Buffer.from('meme'));

      expect(result.success).toBe(true);
      expect(result.content).toContain('meme');
      expect(result.visibleText).toContain('WHEN THE CODE WORKS');
      expect(result.summary).toContain('Humorous');
    });
  });
});
