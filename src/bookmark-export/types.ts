/**
 * Core types for bookmark export functionality
 */

/**
 * Metadata included in bookmark export files
 */
export interface ExportMetadata {
  exportTimestamp: string;
  totalCount: number;
  exporterVersion: string;
  userId: string;
  username: string;
}

/**
 * Individual bookmark record from export
 */
export interface BookmarkRecord {
  id: string;
  url: string;
  text: string;
  authorUsername: string;
  authorName: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
}

/**
 * Complete bookmark export structure
 */
export interface BookmarkExport {
  metadata: ExportMetadata;
  bookmarks: BookmarkRecord[];
}

/**
 * X API credentials for authentication
 */
export interface Credentials {
  apiKey: string;
  apiSecret: string;
  accessToken?: string;
  accessSecret?: string;
}

/**
 * Rate limit information from X API
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}
