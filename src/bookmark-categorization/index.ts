/**
 * Bookmark categorization module
 * Categorizes bookmarks based on content type and URL patterns
 */

export { BookmarkCategorizer } from './categorizer.js';
export type {
  CategorizationConfig,
  CategorizedBookmark,
  Category,
  CategoryAction,
} from './types.js';
export { DEFAULT_CATEGORIES } from './types.js';
