/**
 * Markdown output generation module
 * Generates markdown files and knowledge base from categorized bookmarks
 */

export { MarkdownTemplates } from './templates.js';
export type {
  Frontmatter,
  MarkdownConfig,
  TemplateContext,
} from './types.js';
export { MarkdownWriter } from './writer.js';
