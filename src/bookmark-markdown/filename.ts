/**
 * Enhanced filename generation for knowledge reorganization.
 *
 * Format: {date}-{handle}-{category}-{title}-{short_id}.md
 *
 * Evidence: `.ralph/specs/tech-spec-2026-01-20-knowledge-reorganization.md:234-285`
 */

import type { CategorizedBookmark } from '../bookmark-categorization/types.js';
import { sanitizeSlug } from '../bookmark-organization/sanitize.js';

/** Maximum filename length (filesystem limit, minus .md extension) */
const MAX_FILENAME_LENGTH = 255 - '.md'.length;

/** Maximum path length for Windows safety */
const MAX_PATH_LENGTH = 240;

/**
 * Generate enhanced filename for bookmark.
 *
 * Format: {date}-{handle}-{category}-{title}-{short_id}.md
 *
 * @param bookmark - Categorized bookmark with all metadata
 * @returns Enhanced filename with mandatory short ID suffix
 *
 * @example
 * ```ts
 * const filename = generateEnhancedFilename(bookmark);
 * // Returns: "2026-01-20-@doodlestein-tools-meta-skill-a1b2c3.md"
 * ```
 */
export function generateEnhancedFilename(bookmark: CategorizedBookmark): string {
  const date = formatDateForFilename(bookmark.createdAt);
  const handle = bookmark.authorUsername ? `@${bookmark.authorUsername}` : 'unknown';
  const category = bookmark.category || 'general';
  const content = bookmark.linkedContent?.[0];

  let title: string;

  if (content?.title) {
    // Use linked content title
    title = sanitizeSlug(content.title);
  } else {
    // Use tweet text excerpt (first line, slugified)
    title = sanitizeSlug(bookmark.text.split('\n')[0]);
  }

  // Build base filename
  let filename = `${date}-${handle}-${category}-${title}`;

  // Add mandatory short ID suffix (last 6 chars of tweet ID)
  const shortId = bookmark.id ? bookmark.id.slice(-6) : 'unknown';
  filename = `${filename}-${shortId}`;

  // Limit total filename length (filesystem limits)
  if (filename.length > MAX_FILENAME_LENGTH) {
    // Truncate title part to fit
    const prefixLength = `${date}-${handle}-${category}-`.length;
    const maxTitleLength = MAX_FILENAME_LENGTH - prefixLength - shortId.length - 2; // -2 for hyphens
    title = title.slice(0, maxTitleLength);
    filename = `${date}-${handle}-${category}-${title}-${shortId}`;
  }

  return `${filename}.md`;
}

/**
 * Format date for filename (YYYY-MM-DD).
 *
 * @param isoDate - ISO date string
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * formatDateForFilename('2026-01-20T12:00:00.000Z');
 * // Returns: "2026-01-20"
 * ```
 */
export function formatDateForFilename(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Validate path length for Windows safety.
 *
 * Throws error with path preview if exceeded.
 *
 * @param path - Full file path to validate
 * @throws {Error} If path exceeds MAX_PATH_LENGTH (240 chars)
 *
 * @example
 * ```ts
 * validatePathLength('knowledge/2026/01-jan/@doodlestein (Doug)/tools/file.md');
 * // Throws if path > 240 chars
 * ```
 */
export function validatePathLength(path: string): void {
  if (path.length > MAX_PATH_LENGTH) {
    const preview = path.length > 50
      ? `${path.slice(0, 50)}...`
      : path;

    throw new Error(
      `Path length ${path.length} exceeds ${MAX_PATH_LENGTH}: ${preview}`
    );
  }
}
