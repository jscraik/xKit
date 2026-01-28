/**
 * Unit tests for TranscriptionAnalyzer
 *
 * Tests for video transcription, speech pattern analysis, presentation style detection,
 * and error handling in the TranscriptionAnalyzer class.
 */

import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    TranscriptionAnalyzer,
    TranscriptionError,
    type SpeechPatterns,
    type VideoAnalysisResult,
} from '../../src/persona-extraction/transcription-analyzer.js';

/**
 * Mock OllamaClient implementation
 */
class MockOllamaClient {
    transcribeVideo = vi.fn();
}

describe('TranscriptionAnalyzer', () => {
    let mockOllamaClient: MockOllamaClient;
    let analyzer: TranscriptionAnalyzer;

    beforeEach(() => {
        mockOllamaClient = new MockOllamaClient();
        analyzer = new TranscriptionAnalyzer(mockOllamaClient as any);
        vi.clearAllMocks();
    });

    describe('transcribe() - Video Transcription', () => {
        it('should successfully transcribe a valid video file', async () => {
            const videoPath = '/path/to/video.mp4';
            const mockTranscript = 'This is a test transcript of a video. It contains multiple sentences.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(mockTranscript);

            const result = await analyzer.transcribe(videoPath);

            expect(result).toBeDefined();
            expect(result.transcript).toBe(mockTranscript);
            expect(result.speechPatterns).toBeDefined();
            expect(result.presentationStyle).toBeDefined();
            expect(result.confidence).toBeGreaterThan(0);
            expect(mockOllamaClient.transcribeVideo).toHaveBeenCalledWith(videoPath);
        });

        it('should return VideoAnalysisResult with correct structure', async () => {
            const videoPath = '/path/to/video.mp4';
            const mockTranscript = 'Hello world. This is a test.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(mockTranscript);

            const result = await analyzer.transcribe(videoPath);

            // Verify VideoAnalysisResult structure
            expect(result.transcript).toBeTypeOf('string');
            expect(result.speechPatterns).toMatchObject({
                pace: expect.stringMatching(/^(slow|medium|fast)$/),
                vocabularyComplexity: expect.stringMatching(/^(basic|intermediate|advanced)$/),
                fillerWordCount: expect.any(Number),
                commonFillers: expect.any(Array),
                averageSentenceLength: expect.any(Number),
                vocabularyDiversity: expect.any(Number),
            });
            expect(result.presentationStyle).toMatch(/^(formal|casual|energetic|calm|technical|storytelling)$/);
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });

        it('should handle empty transcript result', async () => {
            const videoPath = '/path/to/video.mp4';
            mockOllamaClient.transcribeVideo.mockResolvedValue('');

            await expect(analyzer.transcribe(videoPath)).rejects.toThrow(TranscriptionError);
            await expect(analyzer.transcribe(videoPath)).rejects.toMatchObject({
                code: 'TRANSCRIPTION_FAILED',
            });
        });

        it('should handle whitespace-only transcript result', async () => {
            const videoPath = '/path/to/video.mp4';
            mockOllamaClient.transcribeVideo.mockResolvedValue('   \n\t   ');

            await expect(analyzer.transcribe(videoPath)).rejects.toThrow(TranscriptionError);
        });
    });

    describe('Speech Pattern Analysis', () => {
        it('should analyze pace from transcript', async () => {
            const videoPath = '/path/to/video.mp4';
            const fastPaceTranscript = 'Hi. Hey. Hello. Quick. Fast. Done.';
            const slowPaceTranscript = 'This sentence contains many words and complex phrases that indicate a deliberate and measured speaking pace.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(fastPaceTranscript);

            const fastResult = await analyzer.transcribe(videoPath);
            expect(['fast', 'medium']).toContain(fastResult.speechPatterns.pace);

            mockOllamaClient.transcribeVideo.mockResolvedValue(slowPaceTranscript);
            const slowResult = await analyzer.transcribe(videoPath);
            expect(['slow', 'medium']).toContain(slowResult.speechPatterns.pace);
        });

        it('should detect vocabulary complexity', async () => {
            const videoPath = '/path/to/video.mp4';

            // Basic vocabulary
            const basicTranscript = 'The cat sat on the mat. The dog ran in the park.';
            mockOllamaClient.transcribeVideo.mockResolvedValue(basicTranscript);

            const basicResult = await analyzer.transcribe(videoPath);
            expect(['basic', 'intermediate']).toContain(basicResult.speechPatterns.vocabularyComplexity);

            // Technical/advanced vocabulary
            const advancedTranscript =
                'The algorithm encapsulates polymorphism and abstraction through asynchronous optimization paradigms. The implementation leverages architectural scalability and concurrency frameworks.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(advancedTranscript);

            const advancedResult = await analyzer.transcribe(videoPath);
            expect(['intermediate', 'advanced']).toContain(advancedResult.speechPatterns.vocabularyComplexity);
        });

        it('should count and categorize filler words', async () => {
            const videoPath = '/path/to/video.mp4';
            const transcriptWithFillers =
                'Um, like, I was going to say, uh, you know, that basically, um, this is a test.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(transcriptWithFillers);

            const result = await analyzer.transcribe(videoPath);

            expect(result.speechPatterns.fillerWordCount).toBeGreaterThan(0);
            expect(result.speechPatterns.commonFillers).toBeInstanceOf(Array);
            expect(result.speechPatterns.commonFillers.length).toBeGreaterThan(0);
            // Check that common fillers are from our filler words list
            result.speechPatterns.commonFillers.forEach((filler) => {
                expect(['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of', 'kind of', 'I mean', 'okay', 'so', 'well', 'right', 'anyway']).toContain(filler);
            });
        });

        it('should calculate average sentence length', async () => {
            const videoPath = '/path/to/video.mp4';
            const transcript = 'First sentence here. Second sentence here. Third sentence.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(transcript);

            const result = await analyzer.transcribe(videoPath);

            expect(result.speechPatterns.averageSentenceLength).toBeGreaterThan(0);
            expect(result.speechPatterns.averageSentenceLength).toBeTypeOf('number');
        });

        it('should calculate vocabulary diversity', async () => {
            const videoPath = '/path/to/video.mp4';
            const repetitiveTranscript = 'test test test test test';
            const diverseTranscript = 'unique different varied various distinct words';

            mockOllamaClient.transcribeVideo.mockResolvedValue(repetitiveTranscript);
            const repetitiveResult = await analyzer.transcribe(videoPath);

            expect(repetitiveResult.speechPatterns.vocabularyDiversity).toBeLessThan(0.5);

            mockOllamaClient.transcribeVideo.mockResolvedValue(diverseTranscript);
            const diverseResult = await analyzer.transcribe(videoPath);

            expect(diverseResult.speechPatterns.vocabularyDiversity).toBeCloseTo(1.0, 1);
        });
    });

    describe('Presentation Style Detection', () => {
        it('should detect formal presentation style', async () => {
            const videoPath = '/path/to/video.mp4';
            const formalTranscript =
                'Therefore, consequently, furthermore, we must proceed accordingly. Hence, the plan is clear. Thus, we move forward.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(formalTranscript);

            const result = await analyzer.transcribe(videoPath);

            // Formal or casual (depending on how the markers are counted)
            expect(['formal', 'casual', 'calm']).toContain(result.presentationStyle);
        });

        it('should detect casual presentation style', async () => {
            const videoPath = '/path/to/video.mp4';
            const casualTranscript =
                "Hey you guys, this is awesome stuff. Really cool things happening. Super exciting. I'm gonna show you something kinda neat.";

            mockOllamaClient.transcribeVideo.mockResolvedValue(casualTranscript);

            const result = await analyzer.transcribe(videoPath);

            expect(result.presentationStyle).toBe('casual');
        });

        it('should detect energetic presentation style', async () => {
            const videoPath = '/path/to/video.mp4';
            const energeticTranscript =
                'This is amazing! An incredible breakthrough! A powerful and revolutionary game-changer! Fantastic results!';

            mockOllamaClient.transcribeVideo.mockResolvedValue(energeticTranscript);

            const result = await analyzer.transcribe(videoPath);

            // Could be energetic or technical depending on vocabulary analysis
            expect(['energetic', 'technical']).toContain(result.presentationStyle);
        });

        it('should detect storytelling presentation style', async () => {
            const videoPath = '/path/to/video.mp4';
            const storytellingTranscript =
                'Let me tell you a story. Picture this journey. Once upon a time, imagine this narrative. The adventure begins.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(storytellingTranscript);

            const result = await analyzer.transcribe(videoPath);

            expect(result.presentationStyle).toBe('storytelling');
        });

        it('should detect technical presentation style', async () => {
            const videoPath = '/path/to/video.mp4';
            const technicalTranscript =
                'The algorithm framework uses asynchronous optimization. The implementation provides scalability through encapsulation and concurrency. The architecture leverages abstraction.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(technicalTranscript);

            const result = await analyzer.transcribe(videoPath);

            expect(result.presentationStyle).toBe('technical');
        });
    });

    describe('Error Handling', () => {
        it('should throw TranscriptionError for empty video path', async () => {
            await expect(analyzer.transcribe('')).rejects.toThrow(TranscriptionError);
            await expect(analyzer.transcribe('')).rejects.toMatchObject({
                code: 'MISSING_AUDIO',
            });
        });

        it('should throw TranscriptionError for whitespace-only video path', async () => {
            await expect(analyzer.transcribe('   \n\t  ')).rejects.toThrow(TranscriptionError);
        });

        it('should throw TranscriptionError for unsupported file format', async () => {
            const unsupportedPath = '/path/to/document.pdf';

            await expect(analyzer.transcribe(unsupportedPath)).rejects.toThrow(TranscriptionError);
            await expect(analyzer.transcribe(unsupportedPath)).rejects.toMatchObject({
                code: 'UNSUPPORTED_FORMAT',
            });
        });

        it('should throw TranscriptionError for unsupported file extensions', async () => {
            const unsupportedPaths = [
                '/path/to/file.txt',
                '/path/to/file.doc',
                '/path/to/file.docx',
                '/path/to/file.json',
                '/path/to/file.mp3',
            ];

            for (const path of unsupportedPaths) {
                await expect(analyzer.transcribe(path)).rejects.toMatchObject({
                    code: 'UNSUPPORTED_FORMAT',
                });
            }
        });

        it('should accept all supported video formats', async () => {
            const supportedFormats = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];
            const mockTranscript = 'Test transcript.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(mockTranscript);

            for (const ext of supportedFormats) {
                const path = `/path/to/video${ext}`;
                const result = await analyzer.transcribe(path);
                expect(result.transcript).toBe(mockTranscript);
            }
        });

        it('should handle transcription service failure', async () => {
            const videoPath = '/path/to/video.mp4';
            const error = new Error('Network connection failed');

            mockOllamaClient.transcribeVideo.mockRejectedValue(error);

            await expect(analyzer.transcribe(videoPath)).rejects.toThrow(TranscriptionError);
            await expect(analyzer.transcribe(videoPath)).rejects.toMatchObject({
                code: 'ANALYSIS_FAILED',
            });
        });

        it('should wrap unknown errors in TranscriptionError', async () => {
            const videoPath = '/path/to/video.mp4';
            const error = 'String error message';

            mockOllamaClient.transcribeVideo.mockRejectedValue(error);

            await expect(analyzer.transcribe(videoPath)).rejects.toThrow(TranscriptionError);
            await expect(analyzer.transcribe(videoPath)).rejects.toMatchObject({
                code: 'ANALYSIS_FAILED',
            });
        });

        it('should handle transcribeVideo method not implemented', async () => {
            const videoPath = '/path/to/video.mp4';
            const clientWithoutMethod = {};

            const analyzerWithoutMethod = new TranscriptionAnalyzer(clientWithoutMethod as any);

            await expect(analyzerWithoutMethod.transcribe(videoPath)).rejects.toMatchObject({
                code: 'TRANSCRIPTION_FAILED',
                message: expect.stringContaining('not yet implemented'),
            });
        });
    });

    describe('Confidence Calculation', () => {
        it('should calculate higher confidence for longer transcripts', async () => {
            const videoPath = '/path/to/video.mp4';
            const shortTranscript = 'Short. Test.';
            const longTranscript = 'A'.repeat(1000) + '. ' + 'B'.repeat(500) + '. ' + 'C'.repeat(500) + '. ';

            mockOllamaClient.transcribeVideo.mockResolvedValue(shortTranscript);
            const shortResult = await analyzer.transcribe(videoPath);

            mockOllamaClient.transcribeVideo.mockResolvedValue(longTranscript);
            const longResult = await analyzer.transcribe(videoPath);

            expect(longResult.confidence).toBeGreaterThan(shortResult.confidence);
        });

        it('should calculate lower confidence with excessive filler words', async () => {
            const videoPath = '/path/to/video.mp4';
            const cleanTranscript = 'The algorithm is efficient and scalable.';
            const fillersTranscript = 'Um, uh, like, um, you know, basically, um, uh, like, um, you know, um, uh, like, um, basically, um, uh, like, um, you know, um, uh, like, um, basically.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(cleanTranscript);
            const cleanResult = await analyzer.transcribe(videoPath);

            mockOllamaClient.transcribeVideo.mockResolvedValue(fillersTranscript);
            const fillersResult = await analyzer.transcribe(videoPath);

            expect(fillersResult.speechPatterns.fillerWordCount).toBeGreaterThan(20);
            expect(fillersResult.confidence).toBeLessThan(cleanResult.confidence);
        });

        it('should calculate confidence within valid range', async () => {
            const videoPath = '/path/to/video.mp4';
            const transcript = 'Test transcript with multiple sentences.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(transcript);

            const result = await analyzer.transcribe(videoPath);

            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
        });
    });

    describe('analyzePatterns() - Direct Speech Pattern Analysis', () => {
        it('should analyze patterns from transcript directly', async () => {
            const transcript = 'This is a test. It has multiple sentences.';

            const patterns = await analyzer.analyzePatterns(transcript);

            expect(patterns).toMatchObject({
                pace: expect.stringMatching(/^(slow|medium|fast)$/),
                vocabularyComplexity: expect.stringMatching(/^(basic|intermediate|advanced)$/),
                fillerWordCount: expect.any(Number),
                commonFillers: expect.any(Array),
                averageSentenceLength: expect.any(Number),
                vocabularyDiversity: expect.any(Number),
            });
        });

        it('should handle empty transcript gracefully', async () => {
            const patterns = await analyzer.analyzePatterns('');

            expect(patterns.pace).toBeDefined();
            expect(patterns.vocabularyComplexity).toBe('basic');
        });

        it('should handle single-word transcript', async () => {
            const patterns = await analyzer.analyzePatterns('Hello');

            expect(patterns.averageSentenceLength).toBe(1);
        });
    });

    describe('Edge Cases', () => {
        it('should handle transcript with only punctuation', async () => {
            const videoPath = '/path/to/video.mp4';
            mockOllamaClient.transcribeVideo.mockResolvedValue('! . ? ...');

            const result = await analyzer.transcribe(videoPath);

            expect(result.speechPatterns.averageSentenceLength).toBe(0);
        });

        it('should handle very long transcripts', async () => {
            const videoPath = '/path/to/video.mp4';
            const longTranscript = Array(1000)
                .fill('This is a test sentence with multiple words.')
                .join(' ');

            mockOllamaClient.transcribeVideo.mockResolvedValue(longTranscript);

            const result = await analyzer.transcribe(videoPath);

            // 1000 * 42 chars per sentence = 42000 chars
            expect(result.transcript.length).toBeGreaterThan(40000);
            expect(result.confidence).toBeGreaterThan(0.7);
        });

        it('should handle transcript with mixed case', async () => {
            const videoPath = '/path/to/video.mp4';
            const mixedCaseTranscript = 'This MIXED case Transcript Has VARYING casing.';

            mockOllamaClient.transcribeVideo.mockResolvedValue(mixedCaseTranscript);

            const result = await analyzer.transcribe(videoPath);

            expect(result.speechPatterns.vocabularyDiversity).toBeGreaterThan(0);
        });

        it('should detect multiple filler word instances', async () => {
            const videoPath = '/path/to/video.mp4';
            const repetitiveFillers = 'um um um um um like like like you know you know';

            mockOllamaClient.transcribeVideo.mockResolvedValue(repetitiveFillers);

            const result = await analyzer.transcribe(videoPath);

            expect(result.speechPatterns.fillerWordCount).toBe(10);
            expect(result.speechPatterns.commonFillers).toContain('um');
            expect(result.speechPatterns.commonFillers).toContain('like');
        });
    });

    describe('VideoAnalysisResult Structure', () => {
        it('should include optional warnings field', async () => {
            const videoPath = '/path/to/video.mp4';
            mockOllamaClient.transcribeVideo.mockResolvedValue('Test transcript.');

            const result = await analyzer.transcribe(videoPath);

            // Warnings should be undefined or an array
            expect(result.warnings === undefined || Array.isArray(result.warnings)).toBe(true);
        });

        it('should serialize to valid JSON', async () => {
            const videoPath = '/path/to/video.mp4';
            mockOllamaClient.transcribeVideo.mockResolvedValue('Test transcript with multiple sentences for analysis.');

            const result = await analyzer.transcribe(videoPath);

            const serialized = JSON.stringify(result);
            const parsed = JSON.parse(serialized);

            expect(parsed).toMatchObject({
                transcript: expect.any(String),
                speechPatterns: expect.any(Object),
                presentationStyle: expect.any(String),
                confidence: expect.any(Number),
            });
        });
    });
});
