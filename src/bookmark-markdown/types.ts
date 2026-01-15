/**
 * Types for markdown output generation
 */

import type { CategorizedBookmark } from '../bookmark-categorization/types.js';

/**
 * Markdown output configuration
 */
export interface MarkdownConfig {
  outputDir: string;
  archiveFile: string;
  timezone: string;
  includeMetadata: boolean;
  includeFrontmatter: boolean;
  groupByDate: boolean;
}

/**
 * Markdown template context
 */
export interface TemplateContext {
  bookmark: CategorizedBookmark;
  date: string;
  time: string;
  formattedDate: string;
  urls: string[];
  primaryUrl?: string;
}

/**
 * Frontmatter data
 */
export interface Frontmatter {
  title: string;
  type: string;
  date_added: string;
  source: string;
  tags: string[];
  via?: string;
  author?: string;
  url?: string;
  [key: string]: unknown;
}
