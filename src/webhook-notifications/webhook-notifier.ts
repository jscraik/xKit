/**
 * Webhook notification sender
 */

import type { NotificationPayload, WebhookConfig } from './types.js';

export class WebhookNotifier {
  private config: WebhookConfig;

  constructor(config: WebhookConfig) {
    this.config = config;
  }

  /**
   * Send notification
   */
  async notify(payload: NotificationPayload): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Check if we should notify for this event
    const shouldNotify = this.shouldNotify(payload.event);
    if (!shouldNotify) {
      return;
    }

    try {
      const body = this.formatPayload(payload);

      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        console.error(`Webhook notification failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }

  /**
   * Check if we should notify for this event
   */
  private shouldNotify(event: NotificationPayload['event']): boolean {
    switch (event) {
      case 'start':
        return this.config.notifyOn.start;
      case 'success':
        return this.config.notifyOn.success;
      case 'error':
        return this.config.notifyOn.error;
      case 'rate_limit':
        return this.config.notifyOn.rateLimit;
      default:
        return false;
    }
  }

  /**
   * Format payload for specific webhook type
   */
  private formatPayload(payload: NotificationPayload): unknown {
    switch (this.config.type) {
      case 'discord':
        return this.formatDiscord(payload);
      case 'slack':
        return this.formatSlack(payload);
      default:
        return payload;
    }
  }

  /**
   * Format for Discord webhook
   */
  private formatDiscord(payload: NotificationPayload): unknown {
    const color = this.getColor(payload.event);
    const emoji = this.getEmoji(payload.event);

    let description = '';

    switch (payload.event) {
      case 'start':
        description = '🚀 Starting bookmark archiving...';
        break;
      case 'success':
        description = [
          '✅ Bookmark archiving completed successfully!',
          '',
          `📊 **Statistics:**`,
          `• Bookmarks processed: ${payload.data.bookmarksProcessed || 0}`,
          `• Knowledge files created: ${payload.data.knowledgeFilesCreated || 0}`,
          `• Total in archive: ${payload.data.totalInArchive || 0}`,
          payload.data.duration ? `• Duration: ${Math.round(payload.data.duration / 1000)}s` : '',
        ]
          .filter(Boolean)
          .join('\n');
        break;
      case 'error':
        description = ['❌ Bookmark archiving failed', '', `**Error:** ${payload.data.error || 'Unknown error'}`].join(
          '\n',
        );
        break;
      case 'rate_limit':
        description = '⚠️ Rate limit encountered. Waiting before retry...';
        break;
    }

    return {
      embeds: [
        {
          title: `${emoji} xKit Bookmark Archiver`,
          description,
          color,
          timestamp: payload.timestamp,
          footer: {
            text: 'xKit',
          },
        },
      ],
    };
  }

  /**
   * Format for Slack webhook
   */
  private formatSlack(payload: NotificationPayload): unknown {
    const emoji = this.getEmoji(payload.event);

    let text = '';
    const fields: Array<{ title: string; value: string; short: boolean }> = [];

    switch (payload.event) {
      case 'start':
        text = `${emoji} Starting bookmark archiving...`;
        break;
      case 'success':
        text = `${emoji} Bookmark archiving completed successfully!`;
        fields.push(
          { title: 'Bookmarks Processed', value: String(payload.data.bookmarksProcessed || 0), short: true },
          { title: 'Knowledge Files', value: String(payload.data.knowledgeFilesCreated || 0), short: true },
          { title: 'Total in Archive', value: String(payload.data.totalInArchive || 0), short: true },
        );
        if (payload.data.duration) {
          fields.push({ title: 'Duration', value: `${Math.round(payload.data.duration / 1000)}s`, short: true });
        }
        break;
      case 'error':
        text = `${emoji} Bookmark archiving failed`;
        fields.push({ title: 'Error', value: payload.data.error || 'Unknown error', short: false });
        break;
      case 'rate_limit':
        text = `${emoji} Rate limit encountered. Waiting before retry...`;
        break;
    }

    return {
      text,
      attachments:
        fields.length > 0
          ? [
              {
                color: this.getSlackColor(payload.event),
                fields,
                ts: Math.floor(new Date(payload.timestamp).getTime() / 1000),
              },
            ]
          : undefined,
    };
  }

  /**
   * Get color for event
   */
  private getColor(event: NotificationPayload['event']): number {
    switch (event) {
      case 'start':
        return 0x3498db; // Blue
      case 'success':
        return 0x2ecc71; // Green
      case 'error':
        return 0xe74c3c; // Red
      case 'rate_limit':
        return 0xf39c12; // Orange
      default:
        return 0x95a5a6; // Gray
    }
  }

  /**
   * Get Slack color for event
   */
  private getSlackColor(event: NotificationPayload['event']): string {
    switch (event) {
      case 'success':
        return 'good';
      case 'error':
        return 'danger';
      case 'rate_limit':
        return 'warning';
      default:
        return '#3498db';
    }
  }

  /**
   * Get emoji for event
   */
  private getEmoji(event: NotificationPayload['event']): string {
    switch (event) {
      case 'start':
        return '🚀';
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'rate_limit':
        return '⚠️';
      default:
        return '📢';
    }
  }

  /**
   * Notify start
   */
  async notifyStart(): Promise<void> {
    await this.notify({
      event: 'start',
      timestamp: new Date().toISOString(),
      data: {},
    });
  }

  /**
   * Notify success
   */
  async notifySuccess(data: {
    bookmarksProcessed: number;
    knowledgeFilesCreated: number;
    totalInArchive: number;
    duration: number;
  }): Promise<void> {
    await this.notify({
      event: 'success',
      timestamp: new Date().toISOString(),
      data,
    });
  }

  /**
   * Notify error
   */
  async notifyError(error: string): Promise<void> {
    await this.notify({
      event: 'error',
      timestamp: new Date().toISOString(),
      data: { error },
    });
  }

  /**
   * Notify rate limit
   */
  async notifyRateLimit(): Promise<void> {
    await this.notify({
      event: 'rate_limit',
      timestamp: new Date().toISOString(),
      data: {},
    });
  }
}
