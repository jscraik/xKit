/**
 * Markdown file writer
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { CategorizedBookmark } from '../bookmark-categorization/types.js';
import { logger } from '../observability/logger.js';
import { generateEnhancedFilename } from './filename.js';
import { MarkdownTemplates } from './templates.js';
import type { MarkdownConfig } from './types.js';

export class MarkdownWriter {
  private config: MarkdownConfig;
  private templates: MarkdownTemplates;

  constructor(config: Partial<MarkdownConfig> = {}) {
    this.config = {
      outputDir: config.outputDir ?? './knowledge',
      archiveFile: config.archiveFile ?? './bookmarks.md',
      timezone: config.timezone ?? 'America/New_York',
      includeMetadata: config.includeMetadata ?? true,
      includeFrontmatter: config.includeFrontmatter ?? true,
      groupByDate: config.groupByDate ?? true,
      organizeByMonth: config.organizeByMonth ?? true,
    };

    this.templates = new MarkdownTemplates();
  }

  /**
   * Write bookmarks to markdown files
   */
  async write(bookmarks: CategorizedBookmark[]): Promise<{
    archiveFile: string;
    knowledgeFiles: string[];
  }> {
    const knowledgeFiles: string[] = [];

    // Ensure output directories exist
    this.ensureDirectories();

    // Group bookmarks by date if enabled
    const grouped = this.config.groupByDate ? this.groupByDate(bookmarks) : new Map([['all', bookmarks]]);

    // Initialize archive file
    this.initializeArchiveFile();

    // Process each date group
    for (const [date, dateBookmarks] of grouped) {
      if (this.config.groupByDate) {
        this.appendToArchive(`\n# ${date}\n\n`);
      }

      // Process each bookmark
      for (const bookmark of dateBookmarks) {
        // Add to archive
        const entry = this.templates.generateTweetEntry(bookmark);
        this.appendToArchive(entry);

        // Create separate file if action is 'file'
        if (bookmark.categoryAction === 'file') {
          const filePath = await this.writeKnowledgeFile(bookmark);
          if (filePath) {
            knowledgeFiles.push(filePath);
          }
        }
      }
    }

    return {
      archiveFile: this.config.archiveFile,
      knowledgeFiles,
    };
  }

  /**
   * Write a single knowledge file
   */
  private async writeKnowledgeFile(bookmark: CategorizedBookmark): Promise<string | null> {
    try {
      // Generate content based on category
      let content: string;

      switch (bookmark.category) {
        case 'github':
          content = this.templates.generateGitHub(bookmark);
          break;
        case 'article':
          content = this.templates.generateArticle(bookmark);
          break;
        case 'video':
        case 'podcast':
          content = this.templates.generateVideo(bookmark);
          break;
        default:
          // Skip if no specific template
          return null;
      }

      // Generate filename with enhanced format
      const filename = generateEnhancedFilename(bookmark);

      // Determine folder path
      let folder: string;
      if (this.config.organizeByMonth) {
        // Organize by year/month
        const monthPath = this.getMonthPath(bookmark.createdAt);
        // Extract just the category name from the full path (e.g., "knowledge/tools" -> "tools")
        const categoryName = bookmark.categoryFolder
          ? bookmark.categoryFolder.split('/').pop() || bookmark.category || 'general'
          : bookmark.category || 'general';

        // Add author handle as subfolder (e.g., @username)
        const authorHandle = bookmark.authorUsername ? `@${bookmark.authorUsername}` : 'unknown';
        folder = join(this.config.outputDir, monthPath, categoryName, authorHandle);
      } else {
        folder = bookmark.categoryFolder || this.config.outputDir;
      }

      const filePath = join(folder, filename);

      // Ensure directory exists
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Write file
      writeFileSync(filePath, content, 'utf-8');

      return filePath;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(
        {
          event: 'markdown_write_failed',
          bookmarkId: bookmark.id,
          filePath,
          error: errorMessage,
        },
        'Failed to write knowledge file',
      );
      return null;
    }
  }

  /**
   * Get month path for organizing files (e.g., "2026/01-jan")
   */
  private getMonthPath(isoDate: string): string {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const monthNum = String(date.getMonth() + 1).padStart(2, '0');
    const monthName = date
      .toLocaleDateString('en-US', {
        month: 'short',
        timeZone: this.config.timezone,
      })
      .toLowerCase();

    return `${year}/${monthNum}-${monthName}`;
  }

  /**
   * Group bookmarks by date
   */
  private groupByDate(bookmarks: CategorizedBookmark[]): Map<string, CategorizedBookmark[]> {
    const grouped = new Map<string, CategorizedBookmark[]>();

    for (const bookmark of bookmarks) {
      const date = this.formatDate(bookmark.createdAt);

      if (!grouped.has(date)) {
        grouped.set(date, []);
      }

      grouped.get(date)?.push(bookmark);
    }

    // Sort by date (newest first)
    return new Map([...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0])));
  }

  /**
   * Format date for grouping
   */
  private formatDate(isoDate: string): string {
    const date = new Date(isoDate);

    // Format as "Day, Month Date, Year"
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: this.config.timezone,
    };

    return date.toLocaleDateString('en-US', options);
  }

  /**
   * Initialize archive file
   */
  private initializeArchiveFile(): void {
    const dir = dirname(this.config.archiveFile);
    if (!existsSync(dir) && dir !== '.') {
      mkdirSync(dir, { recursive: true });
    }

    // Create file if it doesn't exist
    if (!existsSync(this.config.archiveFile)) {
      writeFileSync(this.config.archiveFile, '# Bookmarks Archive\n\n', 'utf-8');
    }
  }

  /**
   * Append to archive file
   */
  private appendToArchive(content: string): void {
    appendFileSync(this.config.archiveFile, content, 'utf-8');
  }

  /**
   * Ensure all necessary directories exist
   */
  private ensureDirectories(): void {
    // Only ensure base output directory exists
    // Category directories will be created on-demand when files are written
    if (!existsSync(this.config.outputDir)) {
      mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Check if bookmark already exists in archive
   */
  isInArchive(bookmarkId: string): boolean {
    if (!existsSync(this.config.archiveFile)) {
      return false;
    }

    const content = readFileSync(this.config.archiveFile, 'utf-8');
    return content.includes(bookmarkId);
  }

  /**
   * Get archive statistics
   */
  getArchiveStats(): {
    totalEntries: number;
    fileSize: number;
    lastModified: Date;
  } {
    if (!existsSync(this.config.archiveFile)) {
      return {
        totalEntries: 0,
        fileSize: 0,
        lastModified: new Date(),
      };
    }

    const content = readFileSync(this.config.archiveFile, 'utf-8');
    const entries = content.match(/^## @/gm) || [];

    const stats = statSync(this.config.archiveFile);

    return {
      totalEntries: entries.length,
      fileSize: stats.size,
      lastModified: stats.mtime,
    };
  }
}
