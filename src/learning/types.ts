/**
 * Types for learning materials generation
 * Transforms bookmarked content into study guides, flashcards, and quizzes
 */

/**
 * Learning material types
 */
export type MaterialType = 'study-guide' | 'flashcards' | 'quiz';

/**
 * Study guide structure
 */
export interface StudyGuide {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  generatedAt: string;
  content: {
    objectives: string[];
    concepts: StudyConcept[];
    exercises: Exercise[];
    furtherReading: string[];
  };
}

/**
 * Study concept with explanation and examples
 */
export interface StudyConcept {
  name: string;
  explanation: string;
  examples: string[];
  keyPoints: string[];
}

/**
 * Learning exercise
 */
export interface Exercise {
  type: 'reflection' | 'practice' | 'exploration';
  prompt: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Flashcard set
 */
export interface FlashcardSet {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  generatedAt: string;
  cards: Flashcard[];
}

/**
 * Individual flashcard
 */
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}

/**
 * Quiz with questions
 */
export interface Quiz {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  generatedAt: string;
  questions: QuizQuestion[];
}

/**
 * Quiz question
 */
export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'short-answer' | 'application';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string;
  explanation: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

/**
 * Recap of bookmark collection
 */
export interface Recap {
  id: string;
  period: RecapPeriod;
  generatedAt: string;
  bookmarks: {
    total: number;
    processed: number;
  };
  themes: ThemeCluster[];
  connections: TopicConnection[];
  nextSteps: string[];
  reflectionQuestions: string[];
}

/**
 * Recap period
 */
export type RecapPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Themed cluster of bookmarks
 */
export interface ThemeCluster {
  theme: string;
  description: string;
  bookmarks: Array<{
    url: string;
    title: string;
    relevance: number; // 0-1 score
  }>;
  keyInsights: string[];
}

/**
 * Connection between topics
 */
export interface TopicConnection {
  from: string;
  to: string;
  connection: string;
  strength: number; // 0-1 score
}

/**
 * Learning generation options
 */
export interface LearningOptions {
  materialType: MaterialType;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  includeExercises?: boolean;
  includeExamples?: boolean;
}

/**
 * Recap options
 */
export interface RecapOptions {
  period: RecapPeriod;
  categories?: string[];
  minClusterSize?: number;
}
