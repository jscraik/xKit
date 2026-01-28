/**
 * Unit tests for TextAnalyzer class
 *
 * Tests cover:
 * - Text analysis with sample tweets
 * - Communication style extraction
 * - Topic clustering
 * - Batch processing with multiple tweets
 * - Result aggregation across batches
 * - Error handling and edge cases
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TextAnalyzer } from '../../src/persona-extraction/text-analyzer.js';
import type { LLMTextAnalysisResult } from '../../src/persona-extraction/prompts.js';

// Create mock functions that will be shared across tests
const mockGenerate = vi.fn();
const mockList = vi.fn();

// Mock ollama module
vi.mock('ollama', () => {
  return {
    Ollama: class MockOllama {
      generate = mockGenerate;
      list = mockList;
    },
  };
});

describe('TextAnalyzer', () => {
  let analyzer: TextAnalyzer;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Create analyzer instance
    analyzer = new TextAnalyzer({
      host: 'http://localhost:11434',
      model: 'qwen2.5:7b',
      maxTweets: 100,
      batchSize: 10,
      minConfidence: 0.3,
    });
  });

  describe('construction', () => {
    it('should create analyzer with default configuration', () => {
      const defaultAnalyzer = new TextAnalyzer();
      expect(defaultAnalyzer).toBeInstanceOf(TextAnalyzer);
    });

    it('should accept custom configuration', () => {
      const customAnalyzer = new TextAnalyzer({
        host: 'http://custom-host:11434',
        model: 'custom-model',
        maxTweets: 50,
        batchSize: 5,
        minConfidence: 0.5,
      });
      expect(customAnalyzer).toBeInstanceOf(TextAnalyzer);
    });

    it('should allow configuration updates', () => {
      analyzer.configure({ maxTweets: 200 });
      analyzer.configure({ batchSize: 20 });
      analyzer.configure({ minConfidence: 0.7 });
      // No errors thrown indicates successful configuration
    });
  });

  describe('text analysis with sample tweets', () => {
    it('should analyze tweets and return structured result', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'technical and conversational',
        technicalLevel: 'advanced',
        values: ['innovation', 'quality', 'open source'],
        expertise: ['frontend', 'React', 'TypeScript'],
        toneMarkers: ['uses emojis sparingly', 'provides code examples'],
        topicClusters: ['web development', 'performance', 'developer tools'],
        confidence: 0.85,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const tweets = [
        'Just shipped a new feature using React 18! 🚀',
        'TypeScript strict mode is a game changer for type safety',
        'Performance optimization matters - every millisecond counts',
      ];

      const result = await analyzer.analyzeTweets(tweets);

      expect(result).toEqual(mockResponse);
      expect(mockGenerate).toHaveBeenCalledTimes(1);
      expect(mockGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'qwen2.5:7b',
          stream: false,
        }),
      );
    });

    it('should handle empty tweet array', async () => {
      const result = await analyzer.analyzeTweets([]);

      expect(result).toEqual({
        communicationStyle: 'unknown',
        technicalLevel: 'intermediate',
        values: [],
        expertise: [],
        toneMarkers: [],
        topicClusters: [],
        confidence: 0,
      });
    });

    it('should handle tweets with only empty strings', async () => {
      const result = await analyzer.analyzeTweets(['', '   ', '\n']);

      expect(result).toEqual({
        communicationStyle: 'unknown',
        technicalLevel: 'intermediate',
        values: [],
        expertise: [],
        toneMarkers: [],
        topicClusters: [],
        confidence: 0,
      });
    });

    it('should filter out null/undefined tweets', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'casual',
        technicalLevel: 'intermediate',
        values: ['simplicity'],
        expertise: ['web development'],
        toneMarkers: ['friendly'],
        topicClusters: ['coding'],
        confidence: 0.6,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const tweets = ['valid tweet', null as any, undefined as any, 'another valid tweet', ''];
      const result = await analyzer.analyzeTweets(tweets);

      // Should only process valid tweets
      expect(result.communicationStyle).toBe('casual');
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });

    it('should limit tweets to maxTweets configuration', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'concise',
        technicalLevel: 'expert',
        values: ['efficiency'],
        expertise: ['systems'],
        toneMarkers: ['brief'],
        topicClusters: ['optimization'],
        confidence: 0.9,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      // Create 150 tweets but analyzer is configured with maxTweets: 100
      const tweets = Array.from({ length: 150 }, (_, i) => `Tweet ${i + 1}`);
      await analyzer.analyzeTweets(tweets);

      const callArgs = mockGenerate.mock.calls[0];
      const prompt = callArgs[0].prompt;

      // Prompt should only contain 100 tweets
      expect(prompt).toContain('100 posts');
    });
  });

  describe('communication style extraction', () => {
    it('should identify formal communication style', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'formal and professional',
        technicalLevel: 'expert',
        values: ['precision', 'accuracy'],
        expertise: ['academic writing'],
        toneMarkers: ['complete sentences', 'no contractions'],
        topicClusters: ['research', 'methodology'],
        confidence: 0.8,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const formalTweets = [
        'The research indicates a significant correlation between the variables.',
        'One must consider the implications of this approach carefully.',
        'The data suggests that further investigation is warranted.',
      ];

      const result = await analyzer.analyzeTweets(formalTweets);

      expect(result.communicationStyle).toBe('formal and professional');
      expect(result.toneMarkers).toContain('complete sentences');
    });

    it('should identify casual communication style', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'casual and friendly',
        technicalLevel: 'intermediate',
        values: ['approachability'],
        expertise: ['community building'],
        toneMarkers: ['emojis', 'exclamation marks', 'slang'],
        topicClusters: ['social', 'community'],
        confidence: 0.75,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const casualTweets = [
        'Hey folks! Just pushed some cool stuff 🎉',
        'Super excited to share this with everyone!',
        'Check it out, it\'s gonna be awesome!',
      ];

      const result = await analyzer.analyzeTweets(casualTweets);

      expect(result.communicationStyle).toBe('casual and friendly');
      expect(result.toneMarkers).toContain('emojis');
    });

    it('should identify technical communication style', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'highly technical with code examples',
        technicalLevel: 'expert',
        values: ['knowledge sharing', 'precision'],
        expertise: ['software architecture', 'algorithms'],
        toneMarkers: ['code blocks', 'technical terminology'],
        topicClusters: ['programming', 'system design'],
        confidence: 0.9,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const technicalTweets = [
        'The time complexity is O(n log n) for this algorithm.',
        'Here\'s a code example: const map = new Map();',
        'Consider the memory implications of this data structure.',
      ];

      const result = await analyzer.analyzeTweets(technicalTweets);

      expect(result.communicationStyle).toBe('highly technical with code examples');
      expect(result.technicalLevel).toBe('expert');
      expect(result.toneMarkers).toContain('code blocks');
    });
  });

  describe('topic clustering', () => {
    it('should extract and cluster related topics', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'educational',
        technicalLevel: 'advanced',
        values: ['learning', 'teaching'],
        expertise: ['frontend development'],
        toneMarkers: ['explanatory'],
        topicClusters: ['React hooks', 'state management', 'component design'],
        confidence: 0.85,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const reactTweets = [
        'useEffect is crucial for side effects in React hooks',
        'State management with useState vs useReducer',
        'Component composition patterns in modern React',
      ];

      const result = await analyzer.analyzeTweets(reactTweets);

      expect(result.topicClusters).toContain('React hooks');
      expect(result.topicClusters).toContain('state management');
      expect(result.topicClusters).toContain('component design');
    });

    it('should identify diverse topic areas', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'eclectic',
        technicalLevel: 'intermediate',
        values: ['curiosity', 'diversity'],
        expertise: ['generalist'],
        toneMarkers: ['varied'],
        topicClusters: ['technology', 'design', 'business', 'philosophy', 'art'],
        confidence: 0.7,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const diverseTweets = [
        'New tech trend: AI is changing everything',
        'Design principles: less is more',
        'Business strategy: focus on customer value',
        'Philosophical question: what is consciousness?',
        'Art appreciation: the beauty of minimalism',
      ];

      const result = await analyzer.analyzeTweets(diverseTweets);

      expect(result.topicClusters.length).toBeGreaterThan(3);
      expect(result.topicClusters).toContain('technology');
      expect(result.topicClusters).toContain('design');
    });

    it('should handle single-topic focus', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'specialized',
        technicalLevel: 'expert',
        values: ['mastery', 'depth'],
        expertise: ['performance optimization'],
        toneMarkers: ['focused'],
        topicClusters: ['web performance'],
        confidence: 0.95,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const performanceTweets = [
        'Optimize your critical rendering path',
        'Lazy loading images improves performance',
        'Minimize JavaScript bundles for faster load times',
      ];

      const result = await analyzer.analyzeTweets(performanceTweets);

      expect(result.topicClusters).toContain('web performance');
      expect(result.expertise).toContain('performance optimization');
    });
  });

  describe('batch processing with multiple tweets', () => {
    it('should process tweets in batches', async () => {
      const batch1Response: LLMTextAnalysisResult = {
        communicationStyle: 'technical',
        technicalLevel: 'advanced',
        values: ['innovation'],
        expertise: ['batch topic 1'],
        toneMarkers: ['precise'],
        topicClusters: ['batch cluster 1'],
        confidence: 0.8,
      };

      const batch2Response: LLMTextAnalysisResult = {
        communicationStyle: 'technical',
        technicalLevel: 'advanced',
        values: ['quality'],
        expertise: ['batch topic 2'],
        toneMarkers: ['detailed'],
        topicClusters: ['batch cluster 2'],
        confidence: 0.75,
      };

      let callCount = 0;
      mockGenerate.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ response: JSON.stringify(batch1Response) });
        } else {
          return Promise.resolve({ response: JSON.stringify(batch2Response) });
        }
      });

      // Create 25 tweets to force 3 batches (batchSize: 10)
      const tweets = Array.from({ length: 25 }, (_, i) => `Tweet ${i + 1}`);
      const result = await analyzer.batchAnalyze(tweets, 10);

      expect(mockGenerate).toHaveBeenCalledTimes(3);
      expect(result.communicationStyle).toBe('technical');
    });

    it('should aggregate results from multiple batches', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'aggregated style',
        technicalLevel: 'expert',
        values: ['value1', 'value2', 'value3'],
        expertise: ['expertise1', 'expertise2'],
        toneMarkers: ['marker1', 'marker2'],
        topicClusters: ['topic1', 'topic2', 'topic3'],
        confidence: 0.8,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      // Create enough tweets for multiple batches
      const tweets = Array.from({ length: 30 }, (_, i) => `Tweet ${i + 1}`);
      const result = await analyzer.batchAnalyze(tweets, 10);

      // Should aggregate values/expertise/topics from all batches
      expect(result.values.length).toBeGreaterThan(0);
      expect(result.expertise.length).toBeGreaterThan(0);
      expect(result.topicClusters.length).toBeGreaterThan(0);
    });

    it('should use default batchSize when not specified', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'test style',
        technicalLevel: 'intermediate',
        values: ['test'],
        expertise: ['testing'],
        toneMarkers: ['test'],
        topicClusters: ['test'],
        confidence: 0.5,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      // Create 15 tweets (more than default batchSize of 10)
      const tweets = Array.from({ length: 15 }, (_, i) => `Tweet ${i + 1}`);
      await analyzer.batchAnalyze(tweets);

      // Should call generate twice with default batchSize of 10
      expect(mockGenerate).toHaveBeenCalledTimes(2);
    });

    it('should handle single batch without splitting', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'single batch style',
        technicalLevel: 'intermediate',
        values: ['single'],
        expertise: ['batch'],
        toneMarkers: ['simple'],
        topicClusters: ['test'],
        confidence: 0.6,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      // Create 5 tweets (less than batchSize)
      const tweets = Array.from({ length: 5 }, (_, i) => `Tweet ${i + 1}`);
      const result = await analyzer.batchAnalyze(tweets, 10);

      // Should only call generate once
      expect(mockGenerate).toHaveBeenCalledTimes(1);
      expect(result.communicationStyle).toBe('single batch style');
    });
  });

  describe('result aggregation across batches', () => {
    it('should merge unique values from all batches', async () => {
      const batchResults: LLMTextAnalysisResult[] = [
        {
          communicationStyle: 'style1',
          technicalLevel: 'advanced',
          values: ['innovation', 'quality'],
          expertise: ['frontend'],
          toneMarkers: ['marker1'],
          topicClusters: ['topic1'],
          confidence: 0.8,
        },
        {
          communicationStyle: 'style2',
          technicalLevel: 'expert',
          values: ['quality', 'open source'], // 'quality' overlaps
          expertise: ['backend'],
          toneMarkers: ['marker2'],
          topicClusters: ['topic2'],
          confidence: 0.75,
        },
        {
          communicationStyle: 'style1',
          technicalLevel: 'advanced',
          values: ['simplicity'],
          expertise: ['devops'],
          toneMarkers: ['marker3'],
          topicClusters: ['topic3'],
          confidence: 0.7,
        },
      ];

      let callIndex = 0;
      mockGenerate.mockImplementation(() => {
        const result = batchResults[callIndex];
        callIndex++;
        return Promise.resolve({ response: JSON.stringify(result) });
      });

      // Create enough tweets for 3 batches
      const tweets = Array.from({ length: 30 }, (_, i) => `Tweet ${i + 1}`);
      const result = await analyzer.batchAnalyze(tweets, 10);

      // Should merge unique values
      expect(result.values).toContain('innovation');
      expect(result.values).toContain('quality');
      expect(result.values).toContain('open source');
      expect(result.values).toContain('simplicity');
      expect(result.values.length).toBe(4); // No duplicates
    });

    it('should select dominant communication style', async () => {
      const batchResults: LLMTextAnalysisResult[] = [
        {
          communicationStyle: 'technical',
          technicalLevel: 'expert',
          values: ['value1'],
          expertise: ['expertise1'],
          toneMarkers: ['marker1'],
          topicClusters: ['topic1'],
          confidence: 0.8,
        },
        {
          communicationStyle: 'technical', // Same as batch 1
          technicalLevel: 'advanced',
          values: ['value2'],
          expertise: ['expertise2'],
          toneMarkers: ['marker2'],
          topicClusters: ['topic2'],
          confidence: 0.75,
        },
        {
          communicationStyle: 'casual', // Different
          technicalLevel: 'intermediate',
          values: ['value3'],
          expertise: ['expertise3'],
          toneMarkers: ['marker3'],
          topicClusters: ['topic3'],
          confidence: 0.7,
        },
      ];

      let callIndex = 0;
      mockGenerate.mockImplementation(() => {
        const result = batchResults[callIndex];
        callIndex++;
        return Promise.resolve({ response: JSON.stringify(result) });
      });

      const tweets = Array.from({ length: 30 }, (_, i) => `Tweet ${i + 1}`);
      const result = await analyzer.batchAnalyze(tweets, 10);

      // 'technical' appears twice, 'casual' appears once
      expect(result.communicationStyle).toBe('technical');
    });

    it('should select highest technical level', async () => {
      const batchResults: LLMTextAnalysisResult[] = [
        {
          communicationStyle: 'style1',
          technicalLevel: 'intermediate',
          values: ['value1'],
          expertise: ['expertise1'],
          toneMarkers: ['marker1'],
          topicClusters: ['topic1'],
          confidence: 0.8,
        },
        {
          communicationStyle: 'style2',
          technicalLevel: 'expert', // Highest
          values: ['value2'],
          expertise: ['expertise2'],
          toneMarkers: ['marker2'],
          topicClusters: ['topic2'],
          confidence: 0.75,
        },
        {
          communicationStyle: 'style3',
          technicalLevel: 'advanced',
          values: ['value3'],
          expertise: ['expertise3'],
          toneMarkers: ['marker3'],
          topicClusters: ['topic3'],
          confidence: 0.7,
        },
      ];

      let callIndex = 0;
      mockGenerate.mockImplementation(() => {
        const result = batchResults[callIndex];
        callIndex++;
        return Promise.resolve({ response: JSON.stringify(result) });
      });

      const tweets = Array.from({ length: 30 }, (_, i) => `Tweet ${i + 1}`);
      const result = await analyzer.batchAnalyze(tweets, 10);

      // Should select 'expert' as highest level
      expect(result.technicalLevel).toBe('expert');
    });

    it('should calculate average confidence across batches', async () => {
      const batchResults: LLMTextAnalysisResult[] = [
        {
          communicationStyle: 'style1',
          technicalLevel: 'expert',
          values: ['value1'],
          expertise: ['expertise1'],
          toneMarkers: ['marker1'],
          topicClusters: ['topic1'],
          confidence: 0.8,
        },
        {
          communicationStyle: 'style2',
          technicalLevel: 'expert',
          values: ['value2'],
          expertise: ['expertise2'],
          toneMarkers: ['marker2'],
          topicClusters: ['topic2'],
          confidence: 0.6,
        },
        {
          communicationStyle: 'style3',
          technicalLevel: 'expert',
          values: ['value3'],
          expertise: ['expertise3'],
          toneMarkers: ['marker3'],
          topicClusters: ['topic3'],
          confidence: 0.7,
        },
      ];

      let callIndex = 0;
      mockGenerate.mockImplementation(() => {
        const result = batchResults[callIndex];
        callIndex++;
        return Promise.resolve({ response: JSON.stringify(result) });
      });

      const tweets = Array.from({ length: 30 }, (_, i) => `Tweet ${i + 1}`);
      const result = await analyzer.batchAnalyze(tweets, 10);

      // Average: (0.8 + 0.6 + 0.7) / 3 = 0.7
      expect(result.confidence).toBeCloseTo(0.7, 1);
    });
  });

  describe('error handling', () => {
    it('should handle Ollama connection errors gracefully', async () => {
      mockGenerate.mockRejectedValue(
        new Error('Connection refused'),
      );

      const tweets = ['Test tweet'];
      const result = await analyzer.analyzeTweets(tweets);

      expect(result).toEqual({
        communicationStyle: 'unknown',
        technicalLevel: 'intermediate',
        values: [],
        expertise: [],
        toneMarkers: [],
        topicClusters: [],
        confidence: 0,
      });
    });

    it('should handle invalid JSON responses', async () => {
      mockGenerate.mockResolvedValue({
        response: 'This is not valid JSON {{broken',
      });

      const tweets = ['Test tweet'];
      const result = await analyzer.analyzeTweets(tweets);

      expect(result.communicationStyle).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    it('should handle JSON response with missing fields', async () => {
      const incompleteResponse = {
        communicationStyle: 'test style',
        // Missing other required fields
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(incompleteResponse),
      });

      const tweets = ['Test tweet'];
      const result = await analyzer.analyzeTweets(tweets);

      // Should use defaults for missing fields
      expect(result.communicationStyle).toBe('test style');
      expect(result.technicalLevel).toBe('intermediate');
      expect(Array.isArray(result.values)).toBe(true);
      expect(Array.isArray(result.expertise)).toBe(true);
    });

    it('should handle response with extra text before JSON', async () => {
      const validJson = {
        communicationStyle: 'test style',
        technicalLevel: 'expert',
        values: ['test'],
        expertise: ['testing'],
        toneMarkers: ['test'],
        topicClusters: ['test'],
        confidence: 0.8,
      };

      mockGenerate.mockResolvedValue({
        response: `Here's my analysis:\n\n${JSON.stringify(validJson)}\n\nHope this helps!`,
      });

      const tweets = ['Test tweet'];
      const result = await analyzer.analyzeTweets(tweets);

      expect(result.communicationStyle).toBe('test style');
      expect(result.confidence).toBe(0.8);
    });

    it('should warn when confidence is below threshold', async () => {
      const lowConfidenceResponse: LLMTextAnalysisResult = {
        communicationStyle: 'uncertain',
        technicalLevel: 'intermediate',
        values: [],
        expertise: [],
        toneMarkers: [],
        topicClusters: [],
        confidence: 0.2, // Below default threshold of 0.3
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(lowConfidenceResponse),
      });

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const tweets = ['Test tweet'];
      await analyzer.analyzeTweets(tweets);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('confidence 0.2 below threshold 0.3'),
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle null/undefined tweets in batch analysis', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'test',
        technicalLevel: 'intermediate',
        values: ['test'],
        expertise: ['test'],
        toneMarkers: ['test'],
        topicClusters: ['test'],
        confidence: 0.6,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      const tweets = [
        'valid tweet 1',
        null as any,
        undefined as any,
        'valid tweet 2',
        '',
        '  ',
      ];

      const result = await analyzer.batchAnalyze(tweets, 10);

      // Should filter invalid tweets and process only valid ones
      expect(result.communicationStyle).toBe('test');
      expect(mockGenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAvailable', () => {
    it('should return true when Ollama is available', async () => {
      mockList.mockResolvedValue({
        models: [],
      });

      const available = await analyzer.isAvailable();

      expect(available).toBe(true);
    });

    it('should return false when Ollama is not available', async () => {
      mockList.mockRejectedValue(
        new Error('Connection refused'),
      );

      const available = await analyzer.isAvailable();

      expect(available).toBe(false);
    });
  });

  describe('custom prompt support', () => {
    it('should use custom prompt when provided', async () => {
      const customPrompt = 'Analyze these tweets for specific patterns:';

      const customAnalyzer = new TextAnalyzer({
        customPrompt,
      });

      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'test',
        technicalLevel: 'intermediate',
        values: [],
        expertise: [],
        toneMarkers: [],
        topicClusters: [],
        confidence: 0.5,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      await customAnalyzer.analyzeTweets(['test tweet']);

      const callArgs = mockGenerate.mock.calls[0];
      expect(callArgs[0].prompt).toContain('Analyze these tweets for specific patterns:');
    });

    it('should use default prompt when custom prompt not provided', async () => {
      const mockResponse: LLMTextAnalysisResult = {
        communicationStyle: 'test',
        technicalLevel: 'intermediate',
        values: [],
        expertise: [],
        toneMarkers: [],
        topicClusters: [],
        confidence: 0.5,
      };

      mockGenerate.mockResolvedValue({
        response: JSON.stringify(mockResponse),
      });

      await analyzer.analyzeTweets(['test tweet']);

      const callArgs = mockGenerate.mock.calls[0];
      expect(callArgs[0].prompt).toContain('You are analyzing social media posts');
    });
  });
});
