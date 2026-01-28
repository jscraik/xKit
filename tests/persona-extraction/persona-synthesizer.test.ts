/**
 * Unit tests for PersonaSynthesizer
 *
 * Tests the full persona synthesis pipeline including:
 * - Text-only synthesis
 * - Text + image synthesis
 * - Text + video synthesis
 * - Combined inputs synthesis
 * - Graceful degradation with missing data
 * - Output structure validation
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { PersonaSynthesizer } from '../../src/persona-extraction/persona-synthesizer.js';
import { TextAnalyzer } from '../../src/persona-extraction/text-analyzer.js';
import { VisionAnalyzer, type ImageAnalysisResult } from '../../src/persona-extraction/vision-analyzer.js';
import {
  TranscriptionAnalyzer,
  type VideoAnalysisResult,
} from '../../src/persona-extraction/transcription-analyzer.js';
import type { LLMTextAnalysisResult } from '../../src/persona-extraction/prompts.js';
import type { OllamaClient } from '../../src/bookmark-enrichment/ollama-client.js';

// Mock OllamaClient
const mockOllamaClient = {
  analyzeImage: vi.fn(),
} as unknown as OllamaClient;

// Mock Ollama generate function for synthesis
vi.mock('ollama', () => ({
  Ollama: class {
    host = 'http://localhost:11434';

    async generate() {
      return {
        response: JSON.stringify({
          structured: {
            name: 'testuser',
            communicationStyle: 'technical',
            technicalLevel: 'advanced',
            values: ['innovation', 'quality'],
            expertise: ['frontend', 'React'],
            topics: ['web development', 'performance'],
          },
          narrative: 'Test user is a technical expert who focuses on web development.',
          instructions: 'Respond as a technical expert with focus on web development.',
        }),
      };
    }

    async list() {
      return [];
    }
  },

  // Mock for isAvailable
  list: vi.fn().mockResolvedValue([]),
}));

// Create mock analyzers
const mockTextAnalyzer = {
  analyzeTweets: vi.fn(),
} as unknown as TextAnalyzer;

const mockVisionAnalyzer = {
  analyzeImage: vi.fn(),
} as unknown as VisionAnalyzer;

const mockTranscriptionAnalyzer = {
  transcribe: vi.fn(),
} as unknown as TranscriptionAnalyzer;

// Test data
const mockTextAnalysisResult: LLMTextAnalysisResult = {
  communicationStyle: 'technical',
  technicalLevel: 'advanced',
  values: ['innovation', 'quality', 'open-source'],
  expertise: ['frontend', 'React', 'TypeScript'],
  toneMarkers: ['uses code examples', 'precise terminology'],
  topicClusters: ['web development', 'performance', 'developer tools'],
  confidence: 0.85,
};

const mockImageAnalysisResult: ImageAnalysisResult = {
  style: 'minimalist',
  content: 'code screenshots',
  visibleText: 'const hello = "world";',
  aesthetic: 'clean, monochromatic',
  summary: 'Technical content with code examples',
  success: true,
};

const mockVideoAnalysisResult: VideoAnalysisResult = {
  transcript: 'Hello everyone, today we are going to talk about advanced React patterns.',
  speechPatterns: {
    pace: 'medium',
    vocabularyComplexity: 'advanced',
    fillerWordCount: 3,
    commonFillers: ['um', 'so'],
    averageSentenceLength: 15,
    vocabularyDiversity: 0.65,
  },
  presentationStyle: 'technical',
  confidence: 0.8,
};

describe('PersonaSynthesizer', () => {
  let synthesizer: PersonaSynthesizer;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create synthesizer with mock analyzers
    synthesizer = new PersonaSynthesizer(
      mockTextAnalyzer,
      mockVisionAnalyzer,
      mockTranscriptionAnalyzer,
      {
        host: 'http://localhost:11434',
        model: 'qwen2.5:7b',
        temperature: 0.7,
      }
    );

    // Setup default mock behaviors
    vi.mocked(mockTextAnalyzer.analyzeTweets).mockResolvedValue(mockTextAnalysisResult);
    vi.mocked(mockVisionAnalyzer.analyzeImage).mockResolvedValue(mockImageAnalysisResult);
    vi.mocked(mockTranscriptionAnalyzer.transcribe).mockResolvedValue(mockVideoAnalysisResult);
  });

  describe('Test 1: Full synthesis pipeline with text input', () => {
    it('should successfully synthesize persona from text-only input', async () => {
      const tweets = [
        'Check out this new React feature!',
        'CSS Grid is amazing for layouts.',
        'TypeScript makes frontend code safer.',
      ];

      const result = await synthesizer.synthesize('devuser', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      // Verify text analyzer was called
      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledTimes(1);
      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledWith(tweets);

      // Verify vision and transcription analyzers were NOT called
      expect(mockVisionAnalyzer.analyzeImage).not.toHaveBeenCalled();
      expect(mockTranscriptionAnalyzer.transcribe).not.toHaveBeenCalled();

      // Verify result structure
      expect(result.username).toBe('devuser');
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(result.persona).toBeDefined();
      expect(result.persona.structured).toBeDefined();
      expect(result.persona.narrative).toBeDefined();
      expect(result.persona.instructions).toBeDefined();

      // Verify structured data
      expect(result.persona.structured.communicationStyle).toBe('technical');
      expect(result.persona.structured.technicalLevel).toBeGreaterThan(0);
      expect(Array.isArray(result.persona.structured.values)).toBe(true);
      expect(Array.isArray(result.persona.structured.expertise)).toBe(true);
      expect(Array.isArray(result.persona.structured.topicClusters)).toBe(true);
    });

    it('should handle empty tweets array gracefully', async () => {
      const result = await synthesizer.synthesize('emptyuser', {
        tweets: [],
        options: { includeImages: false, includeVideos: false },
      });

      expect(result.username).toBe('emptyuser');
      expect(result.persona).toBeDefined();
      // Should still produce valid output even with no tweets
      expect(result.persona.narrative).toBeDefined();
    });

    it('should respect maxTweets option', async () => {
      const tweets = Array.from({ length: 150 }, (_, i) => `Tweet ${i}`);

      await synthesizer.synthesize('prolificuser', {
        tweets,
        options: { maxTweets: 50, includeImages: false, includeVideos: false },
      });

      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledTimes(1);
      // Verify it was called with truncated array
      const calledTweets = vi.mocked(mockTextAnalyzer.analyzeTweets).mock.calls[0][0];
      expect(calledTweets.length).toBeLessThanOrEqual(50);
    });
  });

  describe('Test 2: Synthesis with text + image inputs', () => {
    it('should successfully synthesize persona from text and images', async () => {
      const tweets = ['Check out my setup!'];
      const imageBuffers = [Buffer.from('fake image data')];

      const result = await synthesizer.synthesize('visualuser', {
        tweets,
        imageBuffers,
        options: { includeImages: true, includeVideos: false },
      });

      // Verify both text and vision analyzers were called
      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledTimes(1);
      expect(mockVisionAnalyzer.analyzeImage).toHaveBeenCalledTimes(1);
      expect(mockVisionAnalyzer.analyzeImage).toHaveBeenCalledWith(imageBuffers[0]);

      // Verify transcription analyzer was NOT called
      expect(mockTranscriptionAnalyzer.transcribe).not.toHaveBeenCalled();

      // Verify result includes visual insights
      expect(result.username).toBe('visualuser');
      expect(result.persona.structured).toBeDefined();
      expect(result.persona.narrative).toBeDefined();
    });

    it('should handle multiple images', async () => {
      const tweets = ['Multiple screenshots thread'];
      const imageBuffers = [
        Buffer.from('image1'),
        Buffer.from('image2'),
        Buffer.from('image3'),
      ];

      const result = await synthesizer.synthesize('multivisual', {
        tweets,
        imageBuffers,
        options: { includeImages: true, includeVideos: false },
      });

      expect(mockVisionAnalyzer.analyzeImage).toHaveBeenCalledTimes(3);
      expect(result.username).toBe('multivisual');
      expect(result.persona).toBeDefined();
    });

    it('should skip image analysis when includeImages is false', async () => {
      const tweets = ['Text only'];
      const imageBuffers = [Buffer.from('image')];

      await synthesizer.synthesize('textonly', {
        tweets,
        imageBuffers,
        options: { includeImages: false, includeVideos: false },
      });

      expect(mockVisionAnalyzer.analyzeImage).not.toHaveBeenCalled();
    });

    it('should handle image analysis failures gracefully', async () => {
      const tweets = ['This image analysis might fail'];
      const imageBuffers = [Buffer.from('corrupt image')];

      // Mock vision analyzer to throw error
      vi.mocked(mockVisionAnalyzer.analyzeImage).mockRejectedValueOnce(
        new Error('Image analysis failed')
      );

      const result = await synthesizer.synthesize('erroruser', {
        tweets,
        imageBuffers,
        options: { includeImages: true, includeVideos: false },
      });

      // Should still complete synthesis despite image failure
      expect(result.username).toBe('erroruser');
      expect(result.persona).toBeDefined();
    });
  });

  describe('Test 3: Synthesis with text + video inputs', () => {
    it('should successfully synthesize persona from text and videos', async () => {
      const tweets = ['New talk uploaded!'];
      const videoPaths = ['/path/to/video1.mp4'];

      const result = await synthesizer.synthesize('speaker', {
        tweets,
        videoPaths,
        options: { includeImages: false, includeVideos: true },
      });

      // Verify both text and transcription analyzers were called
      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledTimes(1);
      expect(mockTranscriptionAnalyzer.transcribe).toHaveBeenCalledTimes(1);
      expect(mockTranscriptionAnalyzer.transcribe).toHaveBeenCalledWith(videoPaths[0]);

      // Verify vision analyzer was NOT called
      expect(mockVisionAnalyzer.analyzeImage).not.toHaveBeenCalled();

      // Verify result includes speech patterns
      expect(result.username).toBe('speaker');
      expect(result.persona.structured).toBeDefined();
      expect(result.persona.narrative).toBeDefined();
    });

    it('should handle multiple videos', async () => {
      const tweets = ['Talk series'];
      const videoPaths = ['/path/to/video1.mp4', '/path/to/video2.mp4'];

      const result = await synthesizer.synthesize('multispeaker', {
        tweets,
        videoPaths,
        options: { includeImages: false, includeVideos: true },
      });

      expect(mockTranscriptionAnalyzer.transcribe).toHaveBeenCalledTimes(2);
      expect(result.username).toBe('multispeaker');
      expect(result.persona).toBeDefined();
    });

    it('should skip video analysis when includeVideos is false', async () => {
      const tweets = ['Text only'];
      const videoPaths = ['/path/to/video.mp4'];

      await synthesizer.synthesize('notranscription', {
        tweets,
        videoPaths,
        options: { includeImages: false, includeVideos: false },
      });

      expect(mockTranscriptionAnalyzer.transcribe).not.toHaveBeenCalled();
    });

    it('should handle video analysis failures gracefully', async () => {
      const tweets = ['This video analysis might fail'];
      const videoPaths = ['/path/to/corrupt.mp4'];

      // Mock transcription analyzer to throw error
      vi.mocked(mockTranscriptionAnalyzer.transcribe).mockRejectedValueOnce(
        new Error('Video transcription failed')
      );

      const result = await synthesizer.synthesize('videoerror', {
        tweets,
        videoPaths,
        options: { includeImages: false, includeVideos: true },
      });

      // Should still complete synthesis despite video failure
      expect(result.username).toBe('videoerror');
      expect(result.persona).toBeDefined();
    });
  });

  describe('Test 4: Graceful degradation with missing data', () => {
    it('should handle no images or videos provided', async () => {
      const tweets = ['Just text content'];

      const result = await synthesizer.synthesize('textonlyuser', {
        tweets,
        // No imageBuffers or videoPaths
      });

      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledTimes(1);
      expect(mockVisionAnalyzer.analyzeImage).not.toHaveBeenCalled();
      expect(mockTranscriptionAnalyzer.transcribe).not.toHaveBeenCalled();

      expect(result.username).toBe('textonlyuser');
      expect(result.persona).toBeDefined();
    });

    it('should handle empty image buffers array', async () => {
      const tweets = ['Text content'];
      const imageBuffers: Buffer[] = [];

      const result = await synthesizer.synthesize('emptyimages', {
        tweets,
        imageBuffers,
        options: { includeImages: true },
      });

      expect(mockVisionAnalyzer.analyzeImage).not.toHaveBeenCalled();
      expect(result.persona).toBeDefined();
    });

    it('should handle empty video paths array', async () => {
      const tweets = ['Text content'];
      const videoPaths: string[] = [];

      const result = await synthesizer.synthesize('emptyvideos', {
        tweets,
        videoPaths,
        options: { includeVideos: true },
      });

      expect(mockTranscriptionAnalyzer.transcribe).not.toHaveBeenCalled();
      expect(result.persona).toBeDefined();
    });

    it('should handle text analysis failure', async () => {
      const tweets = ['Some tweets'];

      // Mock text analyzer to throw error
      vi.mocked(mockTextAnalyzer.analyzeTweets).mockRejectedValueOnce(
        new Error('Text analysis failed')
      );

      const result = await synthesizer.synthesize('textfail', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      // Should still complete synthesis despite text analysis failure
      expect(result.username).toBe('textfail');
      expect(result.persona).toBeDefined();
    });

    it('should handle all analyses failing', async () => {
      const tweets = ['Content'];
      const imageBuffers = [Buffer.from('image')];
      const videoPaths = ['/path/to/video.mp4'];

      // Mock all analyzers to throw errors
      vi.mocked(mockTextAnalyzer.analyzeTweets).mockRejectedValueOnce(
        new Error('Text failed')
      );
      vi.mocked(mockVisionAnalyzer.analyzeImage).mockRejectedValueOnce(
        new Error('Vision failed')
      );
      vi.mocked(mockTranscriptionAnalyzer.transcribe).mockRejectedValueOnce(
        new Error('Transcription failed')
      );

      const result = await synthesizer.synthesize('allfail', {
        tweets,
        imageBuffers,
        videoPaths,
      });

      // Should still produce a result
      expect(result.username).toBe('allfail');
      expect(result.persona).toBeDefined();
    });
  });

  describe('Test 5: PersonaResult output structure', () => {
    it('should return valid PersonaResult structure', async () => {
      const tweets = ['Test tweet'];

      const result = await synthesizer.synthesize('structuser', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      // Verify top-level structure
      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('analyzedAt');
      expect(result).toHaveProperty('persona');

      // Verify username is correct
      expect(result.username).toBe('structuser');

      // Verify analyzedAt is a valid date
      expect(result.analyzedAt).toBeInstanceOf(Date);
      expect(result.analyzedAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(result.analyzedAt.getTime()).toBeGreaterThan(Date.now() - 10000);

      // Verify persona structure
      expect(result.persona).toHaveProperty('structured');
      expect(result.persona).toHaveProperty('narrative');
      expect(result.persona).toHaveProperty('instructions');
    });

    it('should have valid PersonaStructured data', async () => {
      const tweets = ['Technical tweet about React'];

      const result = await synthesizer.synthesize('structureduser', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      const { structured } = result.persona;

      // Verify all required fields exist
      expect(structured).toHaveProperty('communicationStyle');
      expect(structured).toHaveProperty('technicalLevel');
      expect(structured).toHaveProperty('values');
      expect(structured).toHaveProperty('expertise');
      expect(structured).toHaveProperty('toneMarkers');
      expect(structured).toHaveProperty('topicClusters');

      // Verify types
      expect(typeof structured.communicationStyle).toBe('string');
      expect(typeof structured.technicalLevel).toBe('number');
      expect(Array.isArray(structured.values)).toBe(true);
      expect(Array.isArray(structured.expertise)).toBe(true);
      expect(Array.isArray(structured.toneMarkers)).toBe(true);
      expect(Array.isArray(structured.topicClusters)).toBe(true);

      // Verify technical level is in valid range
      expect(structured.technicalLevel).toBeGreaterThanOrEqual(0);
      expect(structured.technicalLevel).toBeLessThanOrEqual(1);
    });

    it('should have valid narrative string', async () => {
      const tweets = ['Narrative test tweet'];

      const result = await synthesizer.synthesize('narrativeuser', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      expect(typeof result.persona.narrative).toBe('string');
      expect(result.persona.narrative.length).toBeGreaterThan(0);
    });

    it('should have valid instructions string', async () => {
      const tweets = ['Instructions test tweet'];

      const result = await synthesizer.synthesize('instructionsuser', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      expect(typeof result.persona.instructions).toBe('string');
      expect(result.persona.instructions.length).toBeGreaterThan(0);
    });

    it('should map technical level correctly', async () => {
      const tweets = ['Expert level content'];

      const result = await synthesizer.synthesize('expertuser', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      // Based on mock returning "advanced", should map to 0.75
      expect(result.persona.structured.technicalLevel).toBe(0.75);
    });
  });

  describe('Test 6: Synthesis with all inputs combined', () => {
    it('should successfully synthesize from text, images, and videos', async () => {
      const tweets = [
        'Comprehensive content thread',
        'With images and videos',
      ];
      const imageBuffers = [
        Buffer.from('image1'),
        Buffer.from('image2'),
      ];
      const videoPaths = ['/path/to/video1.mp4'];

      const result = await synthesizer.synthesize('comprehensive', {
        tweets,
        imageBuffers,
        videoPaths,
        options: { includeImages: true, includeVideos: true },
      });

      // Verify all analyzers were called
      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledTimes(1);
      expect(mockVisionAnalyzer.analyzeImage).toHaveBeenCalledTimes(2);
      expect(mockTranscriptionAnalyzer.transcribe).toHaveBeenCalledTimes(1);

      // Verify result structure
      expect(result.username).toBe('comprehensive');
      expect(result.persona).toBeDefined();
      expect(result.persona.structured).toBeDefined();
      expect(result.persona.narrative).toBeDefined();
      expect(result.persona.instructions).toBeDefined();

      // Verify structured data includes insights from all sources
      expect(result.persona.structured.communicationStyle).toBeDefined();
      expect(result.persona.structured.expertise.length).toBeGreaterThan(0);
      expect(result.persona.structured.topicClusters.length).toBeGreaterThan(0);
    });

    it('should combine insights from all sources effectively', async () => {
      const tweets = ['Multi-modal content'];
      const imageBuffers = [Buffer.from('image')];
      const videoPaths = ['/path/to/video.mp4'];

      const result = await synthesizer.synthesize('multimodal', {
        tweets,
        imageBuffers,
        videoPaths,
      });

      // Should have comprehensive persona data
      const { structured, narrative, instructions } = result.persona;

      // Structured should be complete
      expect(structured.communicationStyle).toBeTruthy();
      expect(structured.technicalLevel).toBeGreaterThan(0);
      expect(structured.values.length).toBeGreaterThan(0);
      expect(structured.expertise.length).toBeGreaterThan(0);

      // Narrative should be comprehensive
      expect(narrative.length).toBeGreaterThan(50);

      // Instructions should be actionable
      expect(instructions.length).toBeGreaterThan(50);
    });

    it('should handle large combined input', async () => {
      const tweets = Array.from({ length: 100 }, (_, i) => `Tweet number ${i}`);
      const imageBuffers = Array.from({ length: 10 }, (_, i) => Buffer.from(`image${i}`));
      const videoPaths = Array.from({ length: 3 }, (_, i) => `/path/to/video${i}.mp4`);

      const result = await synthesizer.synthesize('largeinput', {
        tweets,
        imageBuffers,
        videoPaths,
        options: { maxTweets: 100 },
      });

      expect(result.username).toBe('largeinput');
      expect(result.persona).toBeDefined();

      // Should have processed all images
      expect(mockVisionAnalyzer.analyzeImage).toHaveBeenCalledTimes(10);

      // Should have processed all videos
      expect(mockTranscriptionAnalyzer.transcribe).toHaveBeenCalledTimes(3);

      // Should have truncated tweets to maxTweets
      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalledTimes(1);
    });
  });

  describe('Additional edge cases', () => {
    it('should throw error for empty username', async () => {
      await expect(
        synthesizer.synthesize('', {
          tweets: ['test'],
        })
      ).rejects.toThrow('Username is required');
    });

    it('should throw error for whitespace-only username', async () => {
      await expect(
        synthesizer.synthesize('   ', {
          tweets: ['test'],
        })
      ).rejects.toThrow('Username is required');
    });

    it('should handle username with special characters', async () => {
      const result = await synthesizer.synthesize('user_123-test', {
        tweets: ['test'],
        options: { includeImages: false, includeVideos: false },
      });

      expect(result.username).toBe('user_123-test');
    });

    it('should filter out empty tweets', async () => {
      const tweets = ['valid tweet', '', '   ', 'another valid tweet'];

      await synthesizer.synthesize('filteruser', {
        tweets,
        options: { includeImages: false, includeVideos: false },
      });

      // Text analyzer should still be called with the array
      expect(mockTextAnalyzer.analyzeTweets).toHaveBeenCalled();
    });
  });

  describe('Configuration and utility methods', () => {
    it('should return correct model name', () => {
      const customSynthesizer = new PersonaSynthesizer(
        mockTextAnalyzer,
        mockVisionAnalyzer,
        mockTranscriptionAnalyzer,
        { model: 'custom-model' }
      );

      expect(customSynthesizer.getModel()).toBe('custom-model');
    });

    it('should return correct host', () => {
      const customSynthesizer = new PersonaSynthesizer(
        mockTextAnalyzer,
        mockVisionAnalyzer,
        mockTranscriptionAnalyzer,
        { host: 'http://custom-host:11434' }
      );

      expect(customSynthesizer.getHost()).toBe('http://custom-host:11434');
    });

    it('should use default configuration when not provided', () => {
      const defaultSynthesizer = new PersonaSynthesizer(
        mockTextAnalyzer,
        mockVisionAnalyzer,
        mockTranscriptionAnalyzer
      );

      expect(defaultSynthesizer.getModel()).toBe('qwen2.5:7b');
      expect(defaultSynthesizer.getHost()).toBe('http://localhost:11434');
    });

    it('should check Ollama availability', async () => {
      const isAvailable = await synthesizer.isAvailable();

      // Should return boolean
      expect(typeof isAvailable).toBe('boolean');
    });
  });
});
