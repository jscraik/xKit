/**
 * Types for bookmark categorization
 */

import type { EnrichedBookmark } from '../bookmark-enrichment/types.js';

/**
 * Category action types
 */
export type CategoryAction = 'file' | 'capture' | 'transcribe';

/**
 * Category definition
 */
export interface Category {
  match: string[];
  action: CategoryAction;
  folder: string;
  template?: string;
  description: string;
}

/**
 * Categorization configuration
 */
export interface CategorizationConfig {
  categories: Record<string, Category>;
  defaultCategory?: string;
}

/**
 * Categorized bookmark
 */
export interface CategorizedBookmark extends EnrichedBookmark {
  category: string;
  categoryAction: CategoryAction;
  categoryFolder: string;
}

/**
 * Default categories (Smaug-inspired)
 */
export const DEFAULT_CATEGORIES: Record<string, Category> = {
  github: {
    match: ['github.com'],
    action: 'file',
    folder: './knowledge/tools',
    template: 'github',
    description: 'GitHub repositories and code',
  },
  article: {
    match: [
      'medium.com',
      'substack.com',
      'dev.to',
      'hashnode.dev',
      'blog.',
      'news.',
      'article.',
      'post.',
      'arxiv.org',
      'papers.',
    ],
    action: 'file',
    folder: './knowledge/articles',
    template: 'article',
    description: 'Articles, blog posts, and papers',
  },
  video: {
    match: ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv'],
    action: 'transcribe',
    folder: './knowledge/videos',
    template: 'video',
    description: 'Videos and streams',
  },
  podcast: {
    match: ['spotify.com/episode', 'podcasts.apple.com', 'overcast.fm'],
    action: 'transcribe',
    folder: './knowledge/podcasts',
    template: 'podcast',
    description: 'Podcast episodes',
  },
  tweet: {
    match: ['x.com', 'twitter.com'],
    action: 'capture',
    folder: '',
    template: 'tweet',
    description: 'Tweets and threads (fallback)',
  },
};
