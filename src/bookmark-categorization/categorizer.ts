/**
 * Bookmark categorization engine
 */

import type { EnrichedBookmark } from '../bookmark-enrichment/types.js';
import type { CategorizationConfig, CategorizedBookmark, Category } from './types.js';
import { DEFAULT_CATEGORIES } from './types.js';

export class BookmarkCategorizer {
  private config: CategorizationConfig;

  constructor(config: Partial<CategorizationConfig> = {}) {
    this.config = {
      categories: {
        ...DEFAULT_CATEGORIES,
        ...config.categories,
      },
      defaultCategory: config.defaultCategory ?? 'tweet',
    };
  }

  /**
   * Categorize a single bookmark
   */
  categorize(bookmark: EnrichedBookmark): CategorizedBookmark {
    // Try to match based on linked content
    if (bookmark.linkedContent && bookmark.linkedContent.length > 0) {
      for (const content of bookmark.linkedContent) {
        const category = this.matchContentType(content.type);
        if (category) {
          return this.applyCategory(bookmark, category);
        }
      }
    }

    // Try to match based on expanded URLs
    if (bookmark.expandedUrls && bookmark.expandedUrls.length > 0) {
      for (const urlInfo of bookmark.expandedUrls) {
        const category = this.matchUrl(urlInfo.finalUrl);
        if (category) {
          return this.applyCategory(bookmark, category);
        }
      }
    }

    // Try to match based on original tweet text URLs
    const urls = this.extractUrls(bookmark.text);
    for (const url of urls) {
      const category = this.matchUrl(url);
      if (category) {
        return this.applyCategory(bookmark, category);
      }
    }

    // Fall back to default category
    const defaultCat = this.config.categories[this.config.defaultCategory!];
    return this.applyCategory(bookmark, defaultCat, this.config.defaultCategory!);
  }

  /**
   * Categorize multiple bookmarks
   */
  categorizeBatch(bookmarks: EnrichedBookmark[]): CategorizedBookmark[] {
    return bookmarks.map((bookmark) => this.categorize(bookmark));
  }

  /**
   * Match content type to category
   */
  private matchContentType(contentType: string): Category | null {
    for (const [name, category] of Object.entries(this.config.categories)) {
      if (name === contentType) {
        return category;
      }
    }
    return null;
  }

  /**
   * Match URL to category
   */
  private matchUrl(url: string): Category | null {
    try {
      const urlObj = new URL(url);
      const fullUrl = url.toLowerCase();
      const hostname = urlObj.hostname.toLowerCase();

      for (const category of Object.values(this.config.categories)) {
        for (const pattern of category.match) {
          const patternLower = pattern.toLowerCase();

          // Check if pattern matches hostname or full URL
          if (hostname.includes(patternLower) || fullUrl.includes(patternLower)) {
            return category;
          }
        }
      }
    } catch {
      // Invalid URL, skip
    }

    return null;
  }

  /**
   * Apply category to bookmark
   */
  private applyCategory(bookmark: EnrichedBookmark, category: Category, categoryName?: string): CategorizedBookmark {
    // If categoryName not provided, find it
    if (!categoryName) {
      for (const [name, cat] of Object.entries(this.config.categories)) {
        if (cat === category) {
          categoryName = name;
          break;
        }
      }
      categoryName = categoryName || 'unknown';
    }

    return {
      ...bookmark,
      category: categoryName,
      categoryAction: category.action,
      categoryFolder: category.folder,
    };
  }

  /**
   * Extract URLs from text
   */
  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    return text.match(urlRegex) || [];
  }

  /**
   * Get category statistics
   */
  getCategoryStats(bookmarks: CategorizedBookmark[]): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const bookmark of bookmarks) {
      stats[bookmark.category] = (stats[bookmark.category] || 0) + 1;
    }

    return stats;
  }

  /**
   * Get all configured categories
   */
  getCategories(): Record<string, Category> {
    return { ...this.config.categories };
  }

  /**
   * Add or update a category
   */
  setCategory(name: string, category: Category): void {
    this.config.categories[name] = category;
  }

  /**
   * Remove a category
   */
  removeCategory(name: string): void {
    delete this.config.categories[name];
  }
}
