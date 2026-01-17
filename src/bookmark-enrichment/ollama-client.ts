/**
 * Ollama client for AI-powered content processing
 */

import { Ollama } from 'ollama';

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

export class OllamaClient {
    private client: Ollama;
    private config: Required<OllamaConfig>;

    constructor(config: Partial<OllamaConfig> = {}) {
        this.config = {
            host: config.host ?? process.env.OLLAMA_HOST ?? 'http://localhost:11434',
            model: config.model ?? process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
            cloudApiKey: config.cloudApiKey ?? process.env.OLLAMA_CLOUD_API_KEY ?? '',
            timeout: config.timeout ?? 30000,
        };

        this.client = new Ollama({
            host: this.config.host,
        });
    }

    /**
     * Check if Ollama is available
     */
    async isAvailable(): Promise<boolean> {
        try {
            await this.client.list();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Summarize article content
     */
    async summarizeArticle(content: string, title?: string): Promise<SummaryResult> {
        const prompt = this.buildSummaryPrompt(content, title);

        try {
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
        } catch (error) {
            throw new Error(`Ollama summarization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Extract key points from content
     */
    async extractKeyPoints(content: string, maxPoints: number = 5): Promise<string[]> {
        const prompt = this.buildKeyPointsPrompt(content, maxPoints);

        try {
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
        } catch (error) {
            console.error('Failed to extract key points:', error);
            return [];
        }
    }

    /**
     * Generate a better title from content
     */
    async generateTitle(content: string): Promise<string | null> {
        const prompt = this.buildTitlePrompt(content);

        try {
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
        } catch (error) {
            console.error('Failed to generate title:', error);
            return null;
        }
    }

    /**
     * Build summary prompt
     */
    private buildSummaryPrompt(content: string, title?: string): string {
        const titleContext = title ? `\nTitle: ${title}\n` : '';

        return `You are a helpful assistant that creates concise summaries of articles.

${titleContext}
Article Content:
${content.slice(0, 8000)}

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
        return `You are a helpful assistant that extracts key points from articles.

Article Content:
${content.slice(0, 8000)}

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
        return `You are a helpful assistant that generates clear, descriptive titles.

Article Content:
${content.slice(0, 2000)}

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
        try {
            const response = await this.client.list();
            return response.models.map((m) => m.name);
        } catch {
            return [];
        }
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
