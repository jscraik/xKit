/**
 * Webhook notifications module
 * Send notifications to Discord, Slack, or generic webhooks
 */

export type {
  NotificationPayload,
  WebhookConfig,
  WebhookType,
} from './types.js';
export { WebhookNotifier } from './webhook-notifier.js';
