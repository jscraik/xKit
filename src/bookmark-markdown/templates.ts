/**
 * Markdown templates for different content types
 */

import type { CategorizedBookmark } from '../bookmark-categorization/types.js';
import type { Frontmatter } from './types.js';

export class MarkdownTemplates {
  /**
   * Generate frontmatter YAML
   */
  generateFrontmatter(data: Frontmatter): string {
    const lines = ['---'];

    for (const [key, value] of Object.entries(data)) {
      if (value === undefined || value === null) {
        continue;
      }

      if (Array.isArray(value)) {
        if (value.length === 0) {
          continue;
        }
        lines.push(`${key}: [${value.map((v) => `"${v}"`).join(', ')}]`);
      } else if (typeof value === 'string') {
        // Escape quotes in strings
        const escaped = value.replace(/"/g, '\\"');
        lines.push(`${key}: "${escaped}"`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }

    lines.push('---');
    return lines.join('\n');
  }

  /**
   * Generate GitHub repository markdown
   */
  generateGitHub(bookmark: CategorizedBookmark): string {
    const content = bookmark.linkedContent?.[0];
    const url = bookmark.expandedUrls?.[0]?.finalUrl || bookmark.url;

    const frontmatter = this.generateFrontmatter({
      title: content?.title || 'GitHub Repository',
      type: 'tool',
      date_added: bookmark.createdAt,
      source: url,
      tags: [...(bookmark.tags || []), ...(content?.topics || []), content?.language || ''].filter(Boolean),
      via: `Twitter bookmark from @${bookmark.authorUsername}`,
      author: content?.author,
      url,
    });

    const parts = [frontmatter, ''];

    // Title
    parts.push(`# ${content?.title || 'GitHub Repository'}`);
    parts.push('');

    // Description
    if (content?.description) {
      parts.push(content.description);
      parts.push('');
    }

    // Metadata
    if (content?.stars !== undefined || content?.language) {
      parts.push('## Metadata');
      parts.push('');
      if (content.stars !== undefined) {
        parts.push(`- **Stars:** ${content.stars}`);
      }
      if (content.language) {
        parts.push(`- **Language:** ${content.language}`);
      }
      parts.push('');
    }

    // README excerpt
    if (content?.readme) {
      parts.push('## README');
      parts.push('');
      parts.push(content.readme);
      parts.push('');
    }

    // Links
    parts.push('## Links');
    parts.push('');
    parts.push(`- [GitHub Repository](${url})`);
    parts.push(`- [Original Tweet](${bookmark.url})`);
    parts.push('');

    // Original tweet or thread
    if (bookmark.threadTweets && bookmark.threadTweets.length > 1) {
      parts.push('## Discovered Via (Thread)');
      parts.push('');
      for (let i = 0; i < bookmark.threadTweets.length; i++) {
        const tweet = bookmark.threadTweets[i];
        parts.push(`### ${i + 1}/${bookmark.threadTweets.length}`);
        parts.push('');
        parts.push(`> ${tweet.text}`);
        parts.push('');
        parts.push(`— @${tweet.authorUsername} (${tweet.authorName})`);
        parts.push('');
      }
    } else {
      parts.push('## Original Tweet');
      parts.push('');
      parts.push(`> ${bookmark.text}`);
      parts.push('');
      parts.push(`— @${bookmark.authorUsername} (${bookmark.authorName})`);
    }

    return parts.join('\n');
  }

  /**
   * Generate article markdown
   */
  generateArticle(bookmark: CategorizedBookmark): string {
    const content = bookmark.linkedContent?.[0];
    const url = bookmark.expandedUrls?.[0]?.finalUrl || bookmark.url;

    const frontmatter = this.generateFrontmatter({
      title: content?.title || 'Article',
      type: 'article',
      date_added: bookmark.createdAt,
      source: url,
      tags: bookmark.tags || [],
      via: `Twitter bookmark from @${bookmark.authorUsername}`,
      author: content?.author,
      published_date: content?.publishedDate,
      reading_time: content?.readingTime,
      word_count: content?.wordCount,
      url,
    });

    const parts = [frontmatter, ''];

    // Title
    parts.push(`# ${content?.title || 'Article'}`);
    parts.push('');

    // Metadata
    if (content?.author || content?.publishedDate || content?.readingTime || content?.wordCount) {
      const meta: string[] = [];
      if (content.author) {
        meta.push(`**Author:** ${content.author}`);
      }
      if (content.publishedDate) {
        const date = new Date(content.publishedDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
        meta.push(`**Published:** ${date}`);
      }
      if (content.readingTime) {
        meta.push(`**Reading Time:** ${content.readingTime} min`);
      }
      if (content.wordCount) {
        meta.push(`**Words:** ${content.wordCount.toLocaleString()}`);
      }
      parts.push(meta.join(' • '));
      parts.push('');
    }

    // AI Summary (if available)
    if (content?.summary && content.aiGenerated) {
      parts.push('## AI Summary');
      parts.push('');
      parts.push(`*Generated by ${content.aiModel || 'AI'}*`);
      parts.push('');
      parts.push(content.summary);
      parts.push('');
    }

    // Key Points (if available)
    if (content?.keyPoints && content.keyPoints.length > 0) {
      parts.push('## Key Points');
      parts.push('');
      for (const point of content.keyPoints) {
        parts.push(`- ${point}`);
      }
      parts.push('');
    }

    // Full Content (if available)
    if (content?.fullContent) {
      parts.push('## Full Content');
      parts.push('');
      parts.push(content.fullContent);
      parts.push('');
    } else if (content?.description || content?.excerpt) {
      // Fallback to description/excerpt
      parts.push('## Summary');
      parts.push('');
      parts.push(content.description || content.excerpt || '');
      parts.push('');
    }

    // Links
    parts.push('## Links');
    parts.push('');
    parts.push(`- [Read Article](${url})`);
    parts.push(`- [Original Tweet](${bookmark.url})`);
    parts.push('');

    // Original tweet or thread
    if (bookmark.threadTweets && bookmark.threadTweets.length > 1) {
      parts.push('## Discovered Via (Thread)');
      parts.push('');
      for (let i = 0; i < bookmark.threadTweets.length; i++) {
        const tweet = bookmark.threadTweets[i];
        parts.push(`### ${i + 1}/${bookmark.threadTweets.length}`);
        parts.push('');
        parts.push(`> ${tweet.text}`);
        parts.push('');
        parts.push(`— @${tweet.authorUsername} (${tweet.authorName})`);
        parts.push('');
      }
    } else {
      parts.push('## Discovered Via');
      parts.push('');
      parts.push(`> ${bookmark.text}`);
      parts.push('');
      parts.push(`— @${bookmark.authorUsername} (${bookmark.authorName})`);
    }

    return parts.join('\n');
  }

  /**
   * Generate video markdown
   */
  generateVideo(bookmark: CategorizedBookmark): string {
    const content = bookmark.linkedContent?.[0];
    const url = bookmark.expandedUrls?.[0]?.finalUrl || bookmark.url;

    const frontmatter = this.generateFrontmatter({
      title: content?.title || 'Video',
      type: 'video',
      date_added: bookmark.createdAt,
      source: url,
      tags: bookmark.tags || [],
      via: `Twitter bookmark from @${bookmark.authorUsername}`,
      author: content?.author,
      duration: content?.duration,
      transcribed: false,
      url,
    });

    const parts = [frontmatter, ''];

    // Title
    parts.push(`# ${content?.title || 'Video'}`);
    parts.push('');

    // Metadata
    if (content?.author || content?.duration) {
      const meta: string[] = [];
      if (content.author) {
        meta.push(`**Creator:** ${content.author}`);
      }
      if (content.duration) {
        const minutes = Math.floor(content.duration / 60);
        const seconds = content.duration % 60;
        meta.push(`**Duration:** ${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
      parts.push(meta.join(' • '));
      parts.push('');
    }

    // Description
    if (content?.description) {
      parts.push('## Description');
      parts.push('');
      parts.push(content.description);
      parts.push('');
    }

    // Transcript placeholder
    parts.push('## Transcript');
    parts.push('');
    parts.push('_Transcription pending..._');
    parts.push('');

    // Links
    parts.push('## Links');
    parts.push('');
    parts.push(`- [Watch Video](${url})`);
    parts.push(`- [Original Tweet](${bookmark.url})`);
    parts.push('');

    // Original tweet or thread
    if (bookmark.threadTweets && bookmark.threadTweets.length > 1) {
      parts.push('## Discovered Via (Thread)');
      parts.push('');
      for (let i = 0; i < bookmark.threadTweets.length; i++) {
        const tweet = bookmark.threadTweets[i];
        parts.push(`### ${i + 1}/${bookmark.threadTweets.length}`);
        parts.push('');
        parts.push(`> ${tweet.text}`);
        parts.push('');
        parts.push(`— @${tweet.authorUsername} (${tweet.authorName})`);
        parts.push('');
      }
    } else {
      parts.push('## Discovered Via');
      parts.push('');
      parts.push(`> ${bookmark.text}`);
      parts.push('');
      parts.push(`— @${bookmark.authorUsername} (${bookmark.authorName})`);
    }

    return parts.join('\n');
  }

  /**
   * Generate tweet entry for archive
   */
  generateTweetEntry(bookmark: CategorizedBookmark): string {
    const parts: string[] = [];

    // Header with author
    parts.push(`## @${bookmark.authorUsername} - ${this.extractTitle(bookmark)}`);

    // Check if this is a thread
    if (bookmark.threadTweets && bookmark.threadTweets.length > 1) {
      parts.push('');
      parts.push('**Thread:**');
      parts.push('');

      // Display each tweet in the thread
      for (let i = 0; i < bookmark.threadTweets.length; i++) {
        const tweet = bookmark.threadTweets[i];
        parts.push(`### ${i + 1}/${bookmark.threadTweets.length}`);
        parts.push('');
        parts.push(`> ${tweet.text}`);
        parts.push('');
        parts.push(`— @${tweet.authorUsername} (${tweet.authorName})`);
        if (tweet.createdAt) {
          const date = new Date(tweet.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          parts.push(`*${date}*`);
        }
        parts.push('');
      }
    } else {
      // Single tweet
      parts.push(`> ${bookmark.text}`);
      parts.push('');
      parts.push(`— @${bookmark.authorUsername} (${bookmark.authorName})`);
      parts.push('');
    }

    // Metadata
    const metadata: string[] = [];
    metadata.push(`- **Tweet:** ${bookmark.url}`);

    // Add expanded URLs
    if (bookmark.expandedUrls && bookmark.expandedUrls.length > 0) {
      for (const urlInfo of bookmark.expandedUrls) {
        if (urlInfo.finalUrl !== urlInfo.original) {
          metadata.push(`- **Link:** ${urlInfo.finalUrl}`);
        }
      }
    }

    // Add filed location if applicable
    if (bookmark.categoryAction === 'file' && bookmark.linkedContent?.[0]) {
      const filename = this.generateFilename(bookmark);
      metadata.push(`- **Filed:** [${filename}](${bookmark.categoryFolder}/${filename})`);
    }

    // Add content summary
    if (bookmark.linkedContent?.[0]) {
      const content = bookmark.linkedContent[0];
      if (content.title || content.description) {
        metadata.push(`- **What:** ${content.title || content.description}`);
      }
    }

    // Add tags
    if (bookmark.tags && bookmark.tags.length > 0) {
      metadata.push(`- **Tags:** ${bookmark.tags.map((t) => `#${t}`).join(', ')}`);
    }

    parts.push(metadata.join('\n'));
    parts.push('');
    parts.push('---');
    parts.push('');

    return parts.join('\n');
  }

  /**
   * Extract title from bookmark
   */
  private extractTitle(bookmark: CategorizedBookmark): string {
    // Try linked content title
    if (bookmark.linkedContent?.[0]?.title) {
      return bookmark.linkedContent[0].title;
    }

    // Try first line of tweet
    const firstLine = bookmark.text.split('\n')[0];
    if (firstLine.length > 50) {
      return `${firstLine.slice(0, 50)}...`;
    }

    return firstLine;
  }

  /**
   * Generate filename for bookmark
   */
  generateFilename(bookmark: CategorizedBookmark): string {
    const content = bookmark.linkedContent?.[0];

    if (content?.title) {
      // Slugify title
      return `${this.slugify(content.title)}.md`;
    }

    // Use tweet ID as fallback
    return `bookmark-${bookmark.id}.md`;
  }

  /**
   * Slugify text for filenames
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }
}
