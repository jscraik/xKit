/**
 * Types for statistics and reporting
 */

export interface ArchiveStats {
  totalBookmarks: number;
  totalKnowledgeFiles: number;
  categoryCounts: Record<string, number>;
  archiveSize: number;
  lastUpdated: string;
  processingTime: number;
}

export interface ProcessingStats {
  startTime: number;
  endTime?: number;
  bookmarksProcessed: number;
  bookmarksSkipped: number;
  enrichmentTime: number;
  categorizationTime: number;
  writingTime: number;
  errors: number;
}

export interface GrowthStats {
  daily: number;
  weekly: number;
  monthly: number;
  total: number;
}
