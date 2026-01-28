/**
 * TranscriptionAnalyzer for video transcription and speech pattern analysis
 *
 * This class handles:
 * - Video transcription using Ollama client
 * - Speech pattern analysis (pace, vocabulary, filler words, sentence structure)
 * - Presentation style detection
 */

import type { OllamaClient } from '../bookmark-enrichment/ollama-client.js';

/**
 * Speech patterns extracted from transcript
 */
export interface SpeechPatterns {
    /** Speaking pace: slow, medium, or fast */
    pace: 'slow' | 'medium' | 'fast';
    /** Vocabulary complexity level */
    vocabularyComplexity: 'basic' | 'intermediate' | 'advanced';
    /** Count of filler words found */
    fillerWordCount: number;
    /** Common filler words found */
    commonFillers: string[];
    /** Average sentence length in words */
    averageSentenceLength: number;
    /** Word count per minute (if duration available) */
    wordsPerMinute?: number;
    /** Unique word count vs total words (vocabulary diversity) */
    vocabularyDiversity: number; // 0-1 ratio
}

/**
 * Complete video analysis result
 */
export interface VideoAnalysisResult {
    /** Full transcript text */
    transcript: string;
    /** Analyzed speech patterns */
    speechPatterns: SpeechPatterns;
    /** Presentation style classification */
    presentationStyle: 'formal' | 'casual' | 'energetic' | 'calm' | 'technical' | 'storytelling';
    /** Confidence in analysis (0-1) */
    confidence: number;
    /** Any warnings or issues during analysis */
    warnings?: string[];
}

/**
 * Error types for transcription analysis
 */
export class TranscriptionError extends Error {
    constructor(
        message: string,
        public code: 'MISSING_AUDIO' | 'UNSUPPORTED_FORMAT' | 'TRANSCRIPTION_FAILED' | 'ANALYSIS_FAILED'
    ) {
        super(message);
        this.name = 'TranscriptionError';
    }
}

/**
 * Common filler words to detect
 */
const FILLER_WORDS = [
    'um',
    'uh',
    'like',
    'you know',
    'actually',
    'basically',
    'literally',
    'sort of',
    'kind of',
    'I mean',
    'okay',
    'so',
    'well',
    'right',
    'anyway',
];

/**
 * Technical vocabulary indicators (advanced complexity)
 */
const TECHNICAL_INDICATORS = [
    'algorithm',
    'architecture',
    'implementation',
    'optimization',
    'framework',
    'paradigm',
    'methodology',
    'scalability',
    'asynchronous',
    'synchronous',
    'polymorphism',
    'encapsulation',
    'abstraction',
    'inheritance',
    'concurrency',
    'parallelism',
];

/**
 * Formal vs casual language markers
 */
const LANGUAGE_MARKERS = {
    formal: [
        'therefore',
        'consequently',
        'furthermore',
        'moreover',
        'nevertheless',
        'accordingly',
        'hence',
        'thus',
        'herewith',
        'herein',
    ],
    casual: [
        'gonna',
        'wanna',
        'kinda',
        'sorta',
        'awesome',
        'cool',
        'stuff',
        'things',
        'super',
        'really',
        'pretty',
        'like',
        'you guys',
    ],
    energetic: [
        'amazing',
        'incredible',
        'exciting',
        'powerful',
        'revolutionary',
        'breakthrough',
        'game-changer',
        'fantastic',
    ],
    storytelling: [
        'once upon',
        'imagine',
        'picture this',
        'let me tell you',
        'story',
        'narrative',
        'journey',
        'adventure',
    ],
};

/**
 * TranscriptionAnalyzer class for analyzing video content and speech patterns
 */
export class TranscriptionAnalyzer {
    constructor(private ollamaClient: OllamaClient) {}

    /**
     * Transcribe video and analyze speech patterns
     *
     * @param videoPath - Path to video file
     * @returns Complete video analysis with transcript and patterns
     * @throws TranscriptionError if transcription or analysis fails
     */
    async transcribe(videoPath: string): Promise<VideoAnalysisResult> {
        const warnings: string[] = [];

        try {
            // Step 1: Validate video file exists and is accessible
            await this.validateVideoFile(videoPath);

            // Step 2: Transcribe video using Ollama client
            // Note: This method needs to be implemented in OllamaClient (Task #7)
            const transcript = await this.transcribeVideo(videoPath);

            if (!transcript || transcript.trim().length === 0) {
                throw new TranscriptionError('Transcription returned empty result', 'TRANSCRIPTION_FAILED');
            }

            // Step 3: Analyze speech patterns
            const speechPatterns = await this.analyzePatterns(transcript);

            // Step 4: Determine presentation style
            const presentationStyle = this.determinePresentationStyle(transcript, speechPatterns);

            // Step 5: Calculate confidence
            const confidence = this.calculateConfidence(transcript, speechPatterns);

            return {
                transcript,
                speechPatterns,
                presentationStyle,
                confidence,
                warnings: warnings.length > 0 ? warnings : undefined,
            };
        } catch (error) {
            if (error instanceof TranscriptionError) {
                throw error;
            }

            // Wrap unknown errors
            throw new TranscriptionError(
                error instanceof Error ? error.message : 'Unknown error during transcription',
                'ANALYSIS_FAILED'
            );
        }
    }

    /**
     * Analyze speech patterns from transcript
     *
     * @param transcript - Text transcript to analyze
     * @returns Speech pattern metrics
     */
    async analyzePatterns(transcript: string): Promise<SpeechPatterns> {
        const cleanText = transcript.trim();
        const words = this.extractWords(cleanText);
        const sentences = this.extractSentences(cleanText);

        // Calculate basic metrics
        const fillerAnalysis = this.analyzeFillerWords(cleanText);
        const vocabularyComplexity = this.assessVocabularyComplexity(words);
        const averageSentenceLength = this.calculateAverageSentenceLength(words, sentences);
        const vocabularyDiversity = this.calculateVocabularyDiversity(words);

        // Determine pace (if we had timing data, we'd use it)
        // For now, we'll estimate based on sentence structure complexity
        const pace = this.estimatePace(averageSentenceLength, vocabularyComplexity);

        return {
            pace,
            vocabularyComplexity,
            fillerWordCount: fillerAnalysis.count,
            commonFillers: fillerAnalysis.common,
            averageSentenceLength,
            vocabularyDiversity,
        };
    }

    /**
     * Validate that video file exists and is accessible
     */
    private async validateVideoFile(videoPath: string): Promise<void> {
        // This would use fs/promises to check file existence
        // For now, we'll just validate the path format
        if (!videoPath || videoPath.trim().length === 0) {
            throw new TranscriptionError('Video path is empty', 'MISSING_AUDIO');
        }

        // Check for common video extensions
        const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv'];
        const hasValidExtension = validExtensions.some((ext) => videoPath.toLowerCase().endsWith(ext));

        if (!hasValidExtension) {
            throw new TranscriptionError(
                `Unsupported video format: ${videoPath}. Supported formats: ${validExtensions.join(', ')}`,
                'UNSUPPORTED_FORMAT'
            );
        }
    }

    /**
     * Transcribe video using Ollama client
     *
     * Note: This method requires OllamaClient.transcribeVideo() to be implemented.
     * See Task #7 in the project roadmap.
     *
     * @param videoPath - Path to video file
     * @returns Transcribed text
     */
    private async transcribeVideo(videoPath: string): Promise<string> {
        // TODO: Call OllamaClient.transcribeVideo() when implemented
        // For now, this is a placeholder that demonstrates the expected interface
        if (typeof (this.ollamaClient as any).transcribeVideo === 'function') {
            return (this.ollamaClient as any).transcribeVideo(videoPath);
        }

        // Fallback: Return an error indicating the method is not yet implemented
        throw new TranscriptionError(
            'OllamaClient.transcribeVideo() not yet implemented. See Task #7.',
            'TRANSCRIPTION_FAILED'
        );
    }

    /**
     * Extract words from text, removing punctuation
     */
    private extractWords(text: string): string[] {
        return text
            .toLowerCase()
            .replace(/[^\w\s']/g, ' ')
            .split(/\s+/)
            .filter((word) => word.length > 0);
    }

    /**
     * Extract sentences from text
     */
    private extractSentences(text: string): string[] {
        return text
            .split(/[.!?]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
    }

    /**
     * Analyze filler words in transcript
     */
    private analyzeFillerWords(text: string): { count: number; common: string[] } {
        const lowerText = text.toLowerCase();
        const fillerCounts: Record<string, number> = {};

        for (const filler of FILLER_WORDS) {
            const regex = new RegExp(`\\b${filler}\\b`, 'gi');
            const matches = lowerText.match(regex);
            if (matches) {
                fillerCounts[filler] = matches.length;
            }
        }

        const totalFillers = Object.values(fillerCounts).reduce((sum, count) => sum + count, 0);
        const sortedFillers = Object.entries(fillerCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([filler]) => filler);

        return {
            count: totalFillers,
            common: sortedFillers,
        };
    }

    /**
     * Assess vocabulary complexity based on technical indicators
     */
    private assessVocabularyComplexity(words: string[]): 'basic' | 'intermediate' | 'advanced' {
        if (words.length === 0) return 'basic';

        const wordSet = new Set(words.map((w) => w.toLowerCase()));
        const technicalCount = TECHNICAL_INDICATORS.filter((term) => wordSet.has(term.toLowerCase())).length;
        const technicalRatio = technicalCount / words.length;

        // Also check average word length
        const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

        if (technicalRatio > 0.05 || avgWordLength > 6) {
            return 'advanced';
        } else if (technicalRatio > 0.01 || avgWordLength > 5) {
            return 'intermediate';
        }
        return 'basic';
    }

    /**
     * Calculate average sentence length
     */
    private calculateAverageSentenceLength(words: string[], sentences: string[]): number {
        if (sentences.length === 0) return 0;
        return Math.round(words.length / sentences.length);
    }

    /**
     * Calculate vocabulary diversity (unique words / total words)
     */
    private calculateVocabularyDiversity(words: string[]): number {
        if (words.length === 0) return 0;
        const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
        return uniqueWords.size / words.length;
    }

    /**
     * Estimate speaking pace based on sentence structure
     */
    private estimatePace(avgSentenceLength: number, vocabularyComplexity: string): 'slow' | 'medium' | 'fast' {
        // Longer sentences with complex vocabulary often indicate slower, more deliberate speech
        if (avgSentenceLength > 25 || vocabularyComplexity === 'advanced') {
            return 'slow';
        } else if (avgSentenceLength < 10 || vocabularyComplexity === 'basic') {
            return 'fast';
        }
        return 'medium';
    }

    /**
     * Determine presentation style from transcript and patterns
     */
    private determinePresentationStyle(
        transcript: string,
        patterns: SpeechPatterns
    ): VideoAnalysisResult['presentationStyle'] {
        const lowerText = transcript.toLowerCase();

        // Count style markers
        const scores = {
            formal: this.countMarkers(lowerText, LANGUAGE_MARKERS.formal),
            casual: this.countMarkers(lowerText, LANGUAGE_MARKERS.casual),
            energetic: this.countMarkers(lowerText, LANGUAGE_MARKERS.energetic),
            storytelling: this.countMarkers(lowerText, LANGUAGE_MARKERS.storytelling),
        };

        // Check for technical content
        const technicalScore = TECHNICAL_INDICATORS.filter((term) => lowerText.includes(term.toLowerCase())).length;

        // Determine dominant style
        let maxScore = 0;
        let dominantStyle: VideoAnalysisResult['presentationStyle'] = 'casual';

        for (const [style, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                dominantStyle = style as VideoAnalysisResult['presentationStyle'];
            }
        }

        // Override to technical if high technical vocabulary
        if (technicalScore > 5 || patterns.vocabularyComplexity === 'advanced') {
            return 'technical';
        }

        return dominantStyle;
    }

    /**
     * Count occurrences of language markers
     */
    private countMarkers(text: string, markers: string[]): number {
        return markers.reduce((count, marker) => {
            return count + (text.includes(marker) ? 1 : 0);
        }, 0);
    }

    /**
     * Calculate confidence in analysis results
     */
    private calculateConfidence(transcript: string, patterns: SpeechPatterns): number {
        let confidence = 0.5; // Base confidence

        // Higher confidence with longer transcripts
        if (transcript.length > 500) confidence += 0.2;
        if (transcript.length > 1000) confidence += 0.1;

        // Lower confidence with excessive filler words
        if (patterns.fillerWordCount > 20) confidence -= 0.1;
        if (patterns.fillerWordCount > 50) confidence -= 0.1;

        // Higher confidence with good vocabulary diversity
        if (patterns.vocabularyDiversity > 0.5) confidence += 0.1;

        return Math.min(Math.max(confidence, 0), 1);
    }
}
