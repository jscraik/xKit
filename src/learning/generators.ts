/**
 * Material generator
 * Transforms bookmarked content into study guides, flashcards, and quizzes
 */

import { randomUUID } from 'node:crypto';
import { OllamaClient } from '../bookmark-enrichment/ollama-client.js';
import { buildTaggedPrompt } from '../bookmark-prompts/tagged-prompts.js';
import { escapeXmlTags } from '../security/sanitizer.js';
import type {
  StudyGuide,
  FlashcardSet,
  Quiz,
  StudyConcept,
  Exercise,
  Flashcard,
  QuizQuestion,
  LearningOptions,
} from './types.js';

/**
 * Material generator
 */
export class MaterialGenerator {
  private llm: OllamaClient;

  constructor() {
    this.llm = new OllamaClient();
  }

  /**
   * Generate study guide from content
   */
  async generateStudyGuide(
    content: string,
    metadata: {
      url: string;
      title: string;
      siteName?: string;
    }
  ): Promise<StudyGuide> {
    const safeContent = escapeXmlTags(content);
    const prompt = this.buildStudyGuidePrompt(safeContent, metadata);

    const response = await this.llm['client'].generate({
      model: this.llm['config'].model,
      prompt,
      stream: false,
      options: { temperature: 0.4, top_p: 0.9 },
    });

    return this.parseStudyGuide(response.response, metadata);
  }

  /**
   * Generate flashcards from content
   */
  async generateFlashcards(
    content: string,
    metadata: {
      url: string;
      title: string;
      siteName?: string;
    },
    count: number = 10
  ): Promise<FlashcardSet> {
    const safeContent = escapeXmlTags(content);
    const prompt = this.buildFlashcardPrompt(safeContent, metadata, count);

    const response = await this.llm['client'].generate({
      model: this.llm['config'].model,
      prompt,
      stream: false,
      options: { temperature: 0.3, top_p: 0.9 },
    });

    return this.parseFlashcards(response.response, metadata);
  }

  /**
   * Generate quiz from content
   */
  async generateQuiz(
    content: string,
    metadata: {
      url: string;
      title: string;
      siteName?: string;
    },
    questionCount: number = 5
  ): Promise<Quiz> {
    const safeContent = escapeXmlTags(content);
    const prompt = this.buildQuizPrompt(safeContent, metadata, questionCount);

    const response = await this.llm['client'].generate({
      model: this.llm['config'].model,
      prompt,
      stream: false,
      options: { temperature: 0.4, top_p: 0.9 },
    });

    return this.parseQuiz(response.response, metadata);
  }

  /**
   * Build study guide prompt
   */
  private buildStudyGuidePrompt(content: string, metadata: { url: string; title: string; siteName?: string }): string {
    const context = this.buildMetadataContext(metadata);

    return buildTaggedPrompt({
      instructions: `You are an expert educator creating comprehensive study guides from technical content.

Your task is to create a structured study guide that helps learners understand and retain the key concepts.

Create a study guide with:

1. **Learning Objectives**: 3-5 specific, measurable learning objectives
2. **Core Concepts**: For each major concept:
   - Clear explanation
   - 2-3 concrete examples
   - 3-5 key points
3. **Exercises**: 3-5 learning exercises:
   - Reflection questions to deepen understanding
   - Practice activities to apply concepts
   - Exploration prompts for further learning
4. **Further Reading**: 3-5 related topics to explore

Return your response as valid JSON:
\`\`\`json
{
  "objectives": ["objective1", "objective2", ...],
  "concepts": [
    {
      "name": "Concept Name",
      "explanation": "Clear explanation...",
      "examples": ["example1", "example2"],
      "keyPoints": ["point1", "point2", "point3"]
    }
  ],
  "exercises": [
    {
      "type": "reflection|practice|exploration",
      "prompt": "Exercise prompt...",
      "difficulty": "beginner|intermediate|advanced"
    }
  ],
  "furtherReading": ["topic1", "topic2", ...]
}
\`\`\``,
      context,
      content,
    });
  }

  /**
   * Build flashcard prompt
   */
  private buildFlashcardPrompt(content: string, metadata: { url: string; title: string; siteName?: string }, count: number): string {
    const context = this.buildMetadataContext(metadata);

    return buildTaggedPrompt({
      instructions: `You are an expert educator creating flashcards for spaced repetition learning.

Your task is to create ${count} high-quality flashcards from this content.

Each flashcard should:
- Test a specific concept, fact, or relationship
- Have a clear, concise question on the front
- Have a complete but concise answer on the back
- Be tagged with relevant topics
- Be rated by difficulty (easy/medium/hard)

Return your response as valid JSON:
\`\`\`json
{
  "cards": [
    {
      "front": "Question or prompt...",
      "back": "Complete answer...",
      "difficulty": "easy|medium|hard",
      "tags": ["tag1", "tag2"]
    }
  ]
}
\`\`\``,
      context,
      content,
    });
  }

  /**
   * Build quiz prompt
   */
  private buildQuizPrompt(content: string, metadata: { url: string; title: string; siteName?: string }, questionCount: number): string {
    const context = this.buildMetadataContext(metadata);

    return buildTaggedPrompt({
      instructions: `You are an expert educator creating assessment quizzes from technical content.

Your task is to create ${questionCount} quiz questions that test understanding of this content.

Question types:
- **multiple-choice**: 4 options, only one correct
- **short-answer**: Open-ended questions requiring concise responses
- **application**: Scenarios that require applying concepts

Each question should include:
- The question text
- Options (for multiple choice)
- Correct answer
- Explanation of why it's correct
- Difficulty level

Return your response as valid JSON:
\`\`\`json
{
  "questions": [
    {
      "type": "multiple-choice|short-answer|application",
      "question": "Question text...",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "Correct answer",
      "explanation": "Why this is correct...",
      "difficulty": "beginner|intermediate|advanced"
    }
  ]
}
\`\`\``,
      context,
      content,
    });
  }

  /**
   * Parse study guide from LLM response
   */
  private parseStudyGuide(response: string, metadata: { url: string; title: string }): StudyGuide {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonText.trim());

      return {
        id: randomUUID(),
        title: `Study Guide: ${metadata.title}`,
        description: `Comprehensive study guide for "${metadata.title}"`,
        sourceUrl: metadata.url,
        generatedAt: new Date().toISOString(),
        content: {
          objectives: parsed.objectives || [],
          concepts: (parsed.concepts || []).map((c: any) => ({
            name: c.name || '',
            explanation: c.explanation || '',
            examples: c.examples || [],
            keyPoints: c.keyPoints || [],
          })),
          exercises: (parsed.exercises || []).map((e: any) => ({
            type: e.type || 'reflection',
            prompt: e.prompt || '',
            difficulty: e.difficulty || 'intermediate',
          })),
          furtherReading: parsed.furtherReading || [],
        },
      };
    } catch {
      // Return empty study guide on parse error
      return {
        id: randomUUID(),
        title: `Study Guide: ${metadata.title}`,
        description: `Study guide for "${metadata.title}"`,
        sourceUrl: metadata.url,
        generatedAt: new Date().toISOString(),
        content: {
          objectives: [],
          concepts: [],
          exercises: [],
          furtherReading: [],
        },
      };
    }
  }

  /**
   * Parse flashcards from LLM response
   */
  private parseFlashcards(response: string, metadata: { url: string; title: string }): FlashcardSet {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonText.trim());

      return {
        id: randomUUID(),
        title: `Flashcards: ${metadata.title}`,
        description: `Flashcards for "${metadata.title}"`,
        sourceUrl: metadata.url,
        generatedAt: new Date().toISOString(),
        cards: (parsed.cards || []).map((c: any) => ({
          id: randomUUID(),
          front: c.front || '',
          back: c.back || '',
          difficulty: c.difficulty || 'medium',
          tags: c.tags || [],
        })),
      };
    } catch {
      return {
        id: randomUUID(),
        title: `Flashcards: ${metadata.title}`,
        description: `Flashcards for "${metadata.title}"`,
        sourceUrl: metadata.url,
        generatedAt: new Date().toISOString(),
        cards: [],
      };
    }
  }

  /**
   * Parse quiz from LLM response
   */
  private parseQuiz(response: string, metadata: { url: string; title: string }): Quiz {
    try {
      const jsonMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : response;
      const parsed = JSON.parse(jsonText.trim());

      return {
        id: randomUUID(),
        title: `Quiz: ${metadata.title}`,
        description: `Quiz for "${metadata.title}"`,
        sourceUrl: metadata.url,
        generatedAt: new Date().toISOString(),
        questions: (parsed.questions || []).map((q: any) => ({
          id: randomUUID(),
          type: q.type || 'multiple-choice',
          question: q.question || '',
          options: q.options || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation || '',
          difficulty: q.difficulty || 'intermediate',
        })),
      };
    } catch {
      return {
        id: randomUUID(),
        title: `Quiz: ${metadata.title}`,
        description: `Quiz for "${metadata.title}"`,
        sourceUrl: metadata.url,
        generatedAt: new Date().toISOString(),
        questions: [],
      };
    }
  }

  /**
   * Build metadata context for prompts
   */
  private buildMetadataContext(metadata: { url: string; title: string; siteName?: string }): string {
    const parts: string[] = [];
    if (metadata.title) parts.push(`Title: ${metadata.title}`);
    if (metadata.url) parts.push(`URL: ${metadata.url}`);
    if (metadata.siteName) parts.push(`Site: ${metadata.siteName}`);
    return parts.join('\n');
  }
}
