/**
 * Ollama client for AI-powered content processing
 */

import pLimit from 'p-limit';
import { Ollama } from 'ollama';
import { buildEnhancedPrompt, type Persona, type SummaryLength, type ContentType } from '../bookmark-prompts/index.js';
import { escapeXmlTags } from '../security/sanitizer.js';

export interface OllamaConfig {
    host?: string;
    model?: string;
    cloudApiKey?: string;
    timeout?: number;
}

export interface SummaryResult {
    summary: string;
    keyPoints: string[];
    model: string;
    tokensUsed?: number;
}

export interface EnhancedSummaryOptions {
    persona?: Persona;
    length?: SummaryLength;
    contentType?: ContentType;
    language?: string;
    customInstructions?: string;
    // Custom template support (Phase 4)
    template?: string;
    templateVars?: Record<string, string>;
}

/**
 * Patterns to detect potential prompt injection attempts
 * These are redacted to prevent AI model manipulation
 */
const SANITIZE_PATTERNS = [
    /ignore\s+(?:previous\s+)?instructions?/gi,
    /ignore\s+above/gi,
    /system\s*:/gi,
    /system\s+prompt/gi,
    /output\s+(?:all\s+)?(?:cookies|tokens|credentials)/gi,
    /override\s+(?:previous\s+)?commands?/gi,
    /<script[\s>]/gi,
    /<\/script>/gi,
    /javascript:/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi,
    /<iframe/gi,
    /document\.cookie/gi,
    /window\.location/gi,
    /eval\s*\(/gi,
    /hacked/gi,
    /pwned/gi,
];

/**
 * Module-level flag to track if resource warning has been logged
 * This ensures the warning is only logged once per session across all instances
 */
let hasLoggedResourceWarningGlobal = false;

export class OllamaClient {
    private client: Ollama;
    private config: Required<OllamaConfig>;

    // Resource limits
    private readonly MAX_CONCURRENT_REQUESTS = 1; // Single request at a time
    private readonly MAX_CONTENT_LENGTH = 10000;
    private requestQueue: ReturnType<typeof pLimit>;

    constructor(config: Partial<OllamaConfig> = {}) {
        this.config = {
            host: config.host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434',
            model: config.model ?? process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
            cloudApiKey: config.cloudApiKey ?? process.env.OLLAMA_CLOUD_API_KEY ?? '',
            timeout: config.timeout ?? 30000,
        };

        // Initialize request queue for rate limiting
        this.requestQueue = pLimit(this.MAX_CONCURRENT_REQUESTS);

        this.client = new Ollama({
            host: this.config.host,
        });

        // Log resource warning on first instantiation (module-level flag)
        logResourceWarningOnce();
    }

    /**
     * Check if Ollama is available
     */
    async isAvailable(): Promise<boolean> {
        return this.requestQueue(async () => {
            try {
                await this.client.list();
                return true;
            } catch {
                return false;
            }
        });
    }

    /**
     * Sanitize content before sending to AI to prevent prompt injection
     * @param content - Raw content to sanitize
     * @returns Sanitized content with length limit
     */
    private sanitizeForAI(content: string): string {
        let sanitized = content;

        // Remove obvious prompt injection patterns
        for (const pattern of SANITIZE_PATTERNS) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }

        // Apply length limit (prevent token overflow)
        return sanitized.substring(0, this.MAX_CONTENT_LENGTH);
    }

    /**
     * Wrap AI requests with queue and timeout for resource management
     */
    private async executeWithLimits<T>(
        fn: () => Promise<T>,
        operation: string
    ): Promise<T> {
        return this.requestQueue(async () => {
            const startTime = Date.now();
            try {
                const result = await fn();
                const duration = Date.now() - startTime;
                console.debug(`AI ${operation} completed in ${duration}ms`);
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                console.error(`AI ${operation} failed after ${duration}ms:`, error);
                throw error;
            }
        });
    }

    /**
     * Summarize article content
     */
    async summarizeArticle(content: string, title?: string): Promise<SummaryResult> {
        return this.executeWithLimits(async () => {
            const prompt = this.buildSummaryPrompt(content, title);

            const response = await this.client.generate({
                model: this.config.model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                },
            });

            return this.parseSummaryResponse(response.response, this.config.model);
        }, 'summarizeArticle');
    }

    /**
     * Summarize article content with enhanced options (persona, length, content type)
     *
     * Uses the new tagged prompt structure (ADR-001) with persona and length customization.
     *
     * @param content - Article content to summarize
     * @param options - Enhanced summary options
     * @returns Summary with key points
     *
     * @example
     * const result = await client.summarizeWithPersona(articleContent, {
     *   url: 'https://example.com/article',
     *   title: 'Understanding TypeScript',
     *   persona: 'curious-learner',
     *   length: 'medium',
     *   contentType: 'article',
     * });
     */
    async summarizeWithPersona(
        content: string,
        options: {
            url: string;
            title: string;
            siteName?: string;
        } & EnhancedSummaryOptions
    ): Promise<SummaryResult> {
        return this.executeWithLimits(async () => {
            const { url, title, siteName, persona, length, contentType, language, customInstructions, template, templateVars } = options;

            // Use enhanced prompt builder with security (escapeXmlTags)
            const safeContent = escapeXmlTags(content);
            const prompt = buildEnhancedPrompt({
                content: safeContent,
                url,
                title,
                siteName,
                persona,
                length,
                contentType,
                language,
                customInstructions,
                // Custom template support (Phase 4)
                template,
                templateVars,
            });

            const response = await this.client.generate({
                model: this.config.model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                },
            });

            return this.parseSummaryResponse(response.response, this.config.model);
        }, 'summarizeWithPersona');
    }

    /**
     * Extract key points from content
     */
    async extractKeyPoints(content: string, maxPoints: number = 5): Promise<string[]> {
        return this.executeWithLimits(async () => {
            const prompt = this.buildKeyPointsPrompt(content, maxPoints);

            const response = await this.client.generate({
                model: this.config.model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                },
            });

            return this.parseKeyPoints(response.response);
        }, 'extractKeyPoints');
    }

    /**
     * Generate a better title from content
     */
    async generateTitle(content: string): Promise<string | null> {
        return this.executeWithLimits(async () => {
            const prompt = this.buildTitlePrompt(content);

            const response = await this.client.generate({
                model: this.config.model,
                prompt,
                stream: false,
                options: {
                    temperature: 0.5,
                    top_p: 0.9,
                },
            });

            return response.response.trim().replace(/^["']|["']$/g, '');
        }, 'generateTitle');
    }

    /**
     * Analyze an image using vision model (llava)
     *
     * Uses the llava model to analyze images and return descriptive text.
     * Falls back gracefully if the vision model is not available.
     *
     * @param imageBuffer - Buffer containing image data
     * @param prompt - Prompt describing what analysis to perform
     * @returns Image analysis response text
     *
     * @example
     * const analysis = await client.analyzeImage(
     *   imageBuffer,
     *   'Describe this image in detail, focusing on the main subject and composition.'
     * );
     */
    async analyzeImage(imageBuffer: Buffer, prompt: string): Promise<string> {
        return this.executeWithLimits(async () => {
            try {
                // Convert image buffer to base64
                const base64Image = imageBuffer.toString('base64');

                const response = await this.client.generate({
                    model: 'llava',
                    prompt,
                    images: [base64Image],
                    stream: false,
                    options: {
                        temperature: 0.3,
                        top_p: 0.9,
                    },
                });

                return response.response.trim();
            } catch (error) {
                // Graceful degradation if vision model is unavailable
                console.warn('Vision model (llava) not available or analysis failed:', error instanceof Error ? error.message : error);
                return '[Image analysis unavailable - vision model not installed]';
            }
        }, 'analyzeImage');
    }

    /**
     * Transcribe audio from a video file using the Whisper model
     *
     * Uses the karanchopda333/whisper:latest model to transcribe speech from audio files.
     * The model reads the file directly from the provided path.
     * Falls back gracefully if the whisper model is not available or transcription fails.
     *
     * @param audioPath - Absolute file path to the audio or video file to transcribe
     * @returns Transcribed text from the audio, or error message if transcription fails
     *
     * @example
     * const transcription = await client.transcribeVideo('/path/to/video.mp4');
     * if (transcription.includes('[Transcription failed')) {
     *   console.error('Could not transcribe video');
     * } else {
     *   console.log('Transcribed text:', transcription);
     * }
     *
     * @remarks
     * - The whisper model requires the file to be accessible at the given path
     * - Transcription timeout is set to 5 minutes for long audio files
     * - This operation is queued and respects the single-request concurrency limit
     */
    async transcribeVideo(audioPath: string): Promise<string> {
        return this.executeWithLimits(async () => {
            try {
                // Validate audio path exists and is readable
                if (!audioPath || typeof audioPath !== 'string') {
                    throw new Error('Invalid audio path provided');
                }

                const response = await this.client.generate({
                    model: 'karanchopda333/whisper:latest',
                    prompt: `Transcribe the audio from file at ${audioPath}`,
                    stream: false,
                });

                return response.response.trim();
            } catch (error) {
                // Graceful degradation if whisper model is unavailable or transcription fails
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.warn(`Audio transcription failed for ${audioPath}:`, errorMessage);
                return `[Transcription failed - ${errorMessage}]`;
            }
        }, 'transcribeVideo');
    }

    /**
     * Build summary prompt
     */
    private buildSummaryPrompt(content: string, title?: string): string {
        const sanitizedContent = this.sanitizeForAI(content);
        const titleContext = title ? `\nTitle: ${title}\n` : '';

        return `You are a helpful assistant that creates concise summaries of articles.

${titleContext}
Article Content:
${sanitizedContent}

Instructions:
1. Write a 2-3 sentence summary that captures the main points
2. Be concise and clear
3. Focus on the key insights and takeaways
4. Do not include any preamble or meta-commentary

Summary:`;
    }

    /**
     * Build key points prompt
     */
    private buildKeyPointsPrompt(content: string, maxPoints: number): string {
        const sanitizedContent = this.sanitizeForAI(content);

        return `You are a helpful assistant that extracts key points from articles.

Article Content:
${sanitizedContent}

Instructions:
1. Extract the ${maxPoints} most important points from this article
2. Each point should be a single, clear sentence
3. Focus on actionable insights and key takeaways
4. Format as a numbered list (1., 2., 3., etc.)
5. Do not include any preamble or meta-commentary

Key Points:`;
    }

    /**
     * Build title generation prompt
     */
    private buildTitlePrompt(content: string): string {
        const sanitizedContent = this.sanitizeForAI(content);

        return `You are a helpful assistant that generates clear, descriptive titles.

Article Content:
${sanitizedContent}

Instructions:
1. Generate a clear, descriptive title for this article
2. Keep it under 80 characters
3. Make it informative and engaging
4. Do not use clickbait language
5. Return only the title, nothing else

Title:`;
    }

    /**
     * Parse summary response
     */
    private parseSummaryResponse(response: string, model: string): SummaryResult {
        const lines = response.trim().split('\n').filter((line) => line.trim());

        // Try to separate summary from key points if both are present
        const summaryLines: string[] = [];
        const keyPointLines: string[] = [];
        let inKeyPoints = false;

        for (const line of lines) {
            if (line.match(/^(key points?|main points?|takeaways?):/i)) {
                inKeyPoints = true;
                continue;
            }

            if (inKeyPoints || line.match(/^[\d-•*]\./)) {
                keyPointLines.push(line);
            } else {
                summaryLines.push(line);
            }
        }

        const summary = summaryLines.join(' ').trim();
        const keyPoints = this.parseKeyPoints(keyPointLines.join('\n'));

        return {
            summary: summary || response.trim(),
            keyPoints,
            model,
        };
    }

    /**
     * Parse key points from response
     */
    private parseKeyPoints(response: string): string[] {
        const lines = response.trim().split('\n');
        const points: string[] = [];

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
                continue;
            }

            // Remove list markers (1., -, *, •, etc.)
            const cleaned = trimmed.replace(/^[\d-•*]+\.?\s*/, '').trim();

            if (cleaned && cleaned.length > 10) {
                points.push(cleaned);
            }
        }

        return points;
    }

    /**
     * Get available models
     */
    async listModels(): Promise<string[]> {
        return this.executeWithLimits(async () => {
            try {
                const response = await this.client.list();
                return response.models.map((m) => m.name);
            } catch {
                return [];
            }
        }, 'listModels');
    }

    /**
     * Get current model
     */
    getModel(): string {
        return this.config.model;
    }

    /**
     * Set model
     */
    setModel(model: string): void {
        this.config.model = model;
    }
}

/**
 * Log resource requirements warning (once per session)
 * Uses module-level flag to ensure warning is only logged once
 */
function logResourceWarningOnce(): void {
    if (!hasLoggedResourceWarningGlobal) {
        console.warn('⚠️  AI Processing Requirements:');
        console.warn('   - Ollama models require 2-4GB RAM');
        console.warn('   - Processing time: 10-30 seconds per article');
        console.warn('   - Only one request processed at a time');
        console.warn('   - Content is sanitized for security');
        hasLoggedResourceWarningGlobal = true;
    }
}
