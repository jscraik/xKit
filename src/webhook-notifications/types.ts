/**
 * Types for webhook notifications
 */

export type WebhookType = 'discord' | 'slack' | 'generic';

export interface WebhookConfig {
  url: string;
  type: WebhookType;
  enabled: boolean;
  notifyOn: {
    success: boolean;
    error: boolean;
    rateLimit: boolean;
    start: boolean;
  };
}

export interface NotificationPayload {
  event: 'start' | 'success' | 'error' | 'rate_limit';
  timestamp: string;
  data: {
    bookmarksProcessed?: number;
    knowledgeFilesCreated?: number;
    error?: string;
    duration?: number;
    totalInArchive?: number;
  };
}
